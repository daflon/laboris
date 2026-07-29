const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { authenticate, superAdminOnly } = require('../middlewares/auth');

const router = Router();

// Todas as rotas do master requerem super_admin
router.use(authenticate, superAdminOnly);

// =============================================
// Status do Sistema (DB, Backups, Métricas)
// =============================================
router.get('/system-status', async (req, res, next) => {
  try {
    // 1. Status do banco de dados com latência
    const dbStatus = { connected: false, latency: null, error: null };
    const dbStart = Date.now();
    try {
      await db.raw('SELECT 1');
      dbStatus.connected = true;
      dbStatus.latency = Date.now() - dbStart;
    } catch (err) {
      dbStatus.error = err.message;
    }

    // 2. Métricas globais
    const [{ count: totalTenants }] = await db('tenants').count('* as count');
    const [{ count: activeTenants }] = await db('tenants').where({ active: true }).count('* as count');
    const [{ count: totalOrders }] = await db('service_orders').whereNull('deleted_at').count('* as count');
    const [{ count: totalClients }] = await db('clients').whereNull('deleted_at').count('* as count');
    const [{ count: totalEquipments }] = await db('equipment').whereNull('deleted_at').count('* as count');
    const [{ count: totalTechnicians }] = await db('technicians').whereNull('deleted_at').count('* as count');

    // 3. Buscar histórico de backups via GitHub API
    let backups = [];
    let backupError = null;
    try {
      const githubResponse = await fetch(
        'https://api.github.com/repos/daflon/laboris/contents/.backups',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'OS-Laboris-App'
          }
        }
      );
      
      if (githubResponse.ok) {
        const files = await githubResponse.json();
        backups = files
          .filter(f => f.name.endsWith('.sql.gz'))
          .map(f => ({
            name: f.name,
            size: f.size,
            date: extractDateFromBackupName(f.name),
            url: f.download_url
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 10); // Últimos 10 backups
      } else {
        backupError = `GitHub API: ${githubResponse.status}`;
      }
    } catch (err) {
      backupError = err.message;
    }

    // 4. Status do deploy (Render health check básico)
    let deployStatus = { healthy: true, message: 'API respondendo normalmente' };

    res.json({
      success: true,
      data: {
        database: dbStatus,
        metrics: {
          tenants: { total: parseInt(totalTenants), active: parseInt(activeTenants) },
          orders: parseInt(totalOrders),
          clients: parseInt(totalClients),
          equipments: parseInt(totalEquipments),
          technicians: parseInt(totalTechnicians)
        },
        backups: {
          list: backups,
          error: backupError,
          lastBackup: backups[0] || null
        },
        deploy: deployStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper: extrair data do nome do backup
function extractDateFromBackupName(filename) {
  // backup_2026-07-27_19-16.sql.gz → 2026-07-27T19:16:00
  const match = filename.match(/backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/);
  if (match) {
    const [, date, time] = match;
    return `${date}T${time.replace('-', ':')}:00`;
  }
  return null;
}

// Stats globais
router.get('/stats', async (req, res, next) => {
  try {
    const [{ count: totalTenants }] = await db('tenants').count('* as count');
    const [{ count: activeTenants }] = await db('tenants').where({ active: true }).count('* as count');
    const [{ count: totalOrders }] = await db('service_orders').whereNull('deleted_at').count('* as count');
    const [{ count: totalClients }] = await db('clients').whereNull('deleted_at').count('* as count');

    res.json({
      success: true,
      data: {
        total_tenants: parseInt(totalTenants),
        active_tenants: parseInt(activeTenants),
        total_orders: parseInt(totalOrders),
        total_clients: parseInt(totalClients),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Listar tenants
router.get('/tenants', async (req, res, next) => {
  try {
    const tenants = await db('tenants').orderBy('created_at', 'desc');

    // Enriquecer com contadores
    const enriched = await Promise.all(
      tenants.map(async (tenant) => {
        const [{ count: orders }] = await db('service_orders').where({ tenant_id: tenant.id }).whereNull('deleted_at').count('* as count');
        const [{ count: clients }] = await db('clients').where({ tenant_id: tenant.id }).whereNull('deleted_at').count('* as count');
        const lastUser = await db('users').where({ tenant_id: tenant.id }).orderBy('last_login', 'desc').first();

        return {
          ...tenant,
          stats: {
            orders: parseInt(orders),
            clients: parseInt(clients),
            last_access: lastUser?.last_login || null,
          },
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// Criar tenant + user admin
router.post('/tenants', async (req, res, next) => {
  try {
    const { name, slug, email, password, modules } = req.body;

    if (!name || !slug || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Nome, slug, email e senha são obrigatórios' },
      });
    }

    // Verificar slug único
    const existing = await db('tenants').where({ slug }).first();
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Slug já em uso' },
      });
    }

    // Verificar email único
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email já cadastrado' },
      });
    }

    // Criar tenant
    const [tenant] = await db('tenants')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        modules: JSON.stringify(modules || ['os']),
      })
      .returning('*');

    // Criar user admin do tenant
    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await db('users')
      .insert({
        tenant_id: tenant.id,
        name: `Admin ${name}`,
        email,
        password_hash,
        role: 'tenant_user',
      })
      .returning('*');

    // Criar company_settings inicial
    await db('company_settings').insert({
      tenant_id: tenant.id,
      name,
    });

    res.status(201).json({
      success: true,
      data: {
        tenant,
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Detalhes de um tenant
router.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await db('tenants').where({ id: req.params.id }).first();
    if (!tenant) return res.status(404).json({ success: false, error: { message: 'Tenant não encontrado' } });

    const users = await db('users').where({ tenant_id: tenant.id }).select('id', 'name', 'email', 'role', 'active', 'last_login');
    const [{ count: orders }] = await db('service_orders').where({ tenant_id: tenant.id }).whereNull('deleted_at').count('* as count');
    const [{ count: clients }] = await db('clients').where({ tenant_id: tenant.id }).whereNull('deleted_at').count('* as count');

    res.json({
      success: true,
      data: {
        ...tenant,
        users,
        stats: { orders: parseInt(orders), clients: parseInt(clients) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Editar tenant
router.put('/tenants/:id', async (req, res, next) => {
  try {
    const { name, modules } = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (modules) updateData.modules = JSON.stringify(modules);

    await db('tenants').where({ id: req.params.id }).update(updateData);
    const tenant = await db('tenants').where({ id: req.params.id }).first();
    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
});

// Toggle ativo/inativo
router.patch('/tenants/:id/toggle', async (req, res, next) => {
  try {
    const tenant = await db('tenants').where({ id: req.params.id }).first();
    if (!tenant) return res.status(404).json({ success: false, error: { message: 'Tenant não encontrado' } });
    await db('tenants').where({ id: req.params.id }).update({ active: !tenant.active, updated_at: new Date().toISOString() });
    const updated = await db('tenants').where({ id: req.params.id }).first();
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// Reset password de um user do tenant
router.put('/tenants/:id/reset-password', async (req, res, next) => {
  try {
    const { user_id, new_password } = req.body;
    if (!new_password || new_password.length < 4) {
      return res.status(400).json({ success: false, error: { message: 'Senha deve ter no mínimo 4 caracteres' } });
    }
    const user = await db('users').where({ id: user_id, tenant_id: req.params.id }).first();
    if (!user) return res.status(404).json({ success: false, error: { message: 'Usuário não encontrado' } });
    const password_hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: user_id }).update({ password_hash, updated_at: new Date().toISOString() });
    res.json({ success: true, data: { message: 'Senha alterada com sucesso' } });
  } catch (error) { next(error); }
});

// Acessar como tenant (impersonate — gera token do tenant pro super admin)
router.post('/tenants/:id/impersonate', async (req, res, next) => {
  try {
    const tenant = await db('tenants').where({ id: req.params.id }).first();
    if (!tenant) return res.status(404).json({ success: false, error: { message: 'Tenant não encontrado' } });
    
    // Obter IP do cliente
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.headers['x-real-ip'] 
      || req.connection?.remoteAddress 
      || req.ip 
      || 'unknown';
    
    // Criar log de impersonate
    const [impersonateLog] = await db('impersonate_logs')
      .insert({
        admin_id: req.user.userId,
        tenant_id: tenant.id,
        ip_address: clientIp,
        started_at: new Date(),
        actions_summary: ''
      })
      .returning('*');
    
    const { generateToken } = require('../middlewares/auth');
    const token = generateToken({
      userId: req.user.userId,
      tenantId: tenant.id,
      role: 'tenant_user',
      email: req.user.email,
      impersonateLogId: impersonateLog.id, // Incluir no token para rastrear ações
      isImpersonating: true
    });
    
    res.json({ 
      success: true, 
      data: { 
        token, 
        tenant,
        impersonateLogId: impersonateLog.id 
      } 
    });
  } catch (error) { next(error); }
});

// Encerrar sessão de impersonate
router.post('/impersonate/:logId/end', async (req, res, next) => {
  try {
    const { logId } = req.params;
    
    await db('impersonate_logs')
      .where({ id: logId })
      .update({ ended_at: new Date() });
    
    res.json({ success: true, data: { message: 'Sessão de impersonate encerrada' } });
  } catch (error) { next(error); }
});

// Listar logs de impersonate
router.get('/impersonate-logs', async (req, res, next) => {
  try {
    const logs = await db('impersonate_logs')
      .leftJoin('users', 'users.id', 'impersonate_logs.admin_id')
      .leftJoin('tenants', 'tenants.id', 'impersonate_logs.tenant_id')
      .select(
        'impersonate_logs.*',
        'users.name as admin_name',
        'users.email as admin_email',
        'tenants.name as tenant_name'
      )
      .orderBy('impersonate_logs.started_at', 'desc')
      .limit(100);
    
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
});

// =============================================
// Log de Auditoria Global (todos os tenants)
// =============================================
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { tenant_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;
    
    let query = db('audit_logs')
      .leftJoin('tenants', 'tenants.id', 'audit_logs.tenant_id')
      .select(
        'audit_logs.*',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug'
      )
      .orderBy('audit_logs.created_at', 'desc');
    
    // Filtros
    if (tenant_id) {
      query = query.where('audit_logs.tenant_id', tenant_id);
    }
    if (action) {
      query = query.where('audit_logs.action', action);
    }
    if (start_date) {
      query = query.where('audit_logs.created_at', '>=', start_date);
    }
    if (end_date) {
      query = query.where('audit_logs.created_at', '<=', end_date);
    }
    
    // Paginação
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const logs = await query.limit(parseInt(limit)).offset(offset);
    
    // Total para paginação
    let countQuery = db('audit_logs').count('* as count');
    if (tenant_id) countQuery = countQuery.where('tenant_id', tenant_id);
    if (action) countQuery = countQuery.where('action', action);
    if (start_date) countQuery = countQuery.where('created_at', '>=', start_date);
    if (end_date) countQuery = countQuery.where('created_at', '<=', end_date);
    
    const [{ count: total }] = await countQuery;
    
    // Estatísticas rápidas
    const actionStats = await db('audit_logs')
      .select('action')
      .count('* as count')
      .groupBy('action')
      .orderBy('count', 'desc');
    
    res.json({
      success: true,
      data: {
        logs,
        stats: {
          total: parseInt(total),
          by_action: actionStats.reduce((acc, { action, count }) => {
            acc[action] = parseInt(count);
            return acc;
          }, {})
        },
        meta: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(parseInt(total) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// Status do UptimeRobot
// =============================================
router.get('/uptime-status', async (req, res, next) => {
  try {
    const apiKey = process.env.UPTIMEROBOT_API_KEY;
    
    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'UptimeRobot não configurado. Adicione UPTIMEROBOT_API_KEY nas variáveis de ambiente.'
        }
      });
    }
    
    // Chamar API do UptimeRobot
    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        format: 'json',
        logs: 1,
        logs_limit: 5,
        response_times: 1,
        response_times_limit: 10,
        all_time_uptime_ratio: 1,
        custom_uptime_ratios: '7-30-90'
      })
    });
    
    const data = await response.json();
    
    if (data.stat !== 'ok') {
      return res.json({
        success: true,
        data: {
          configured: true,
          error: data.error?.message || 'Erro ao consultar UptimeRobot',
          monitors: []
        }
      });
    }
    
    // Processar monitores
    const monitors = (data.monitors || []).map(monitor => ({
      id: monitor.id,
      name: monitor.friendly_name,
      url: monitor.url,
      status: getUptimeStatus(monitor.status),
      statusCode: monitor.status,
      uptime: {
        allTime: parseFloat(monitor.all_time_uptime_ratio || 0).toFixed(2),
        last7Days: monitor.custom_uptime_ratio ? parseFloat(monitor.custom_uptime_ratio.split('-')[0]).toFixed(2) : null,
        last30Days: monitor.custom_uptime_ratio ? parseFloat(monitor.custom_uptime_ratio.split('-')[1]).toFixed(2) : null,
        last90Days: monitor.custom_uptime_ratio ? parseFloat(monitor.custom_uptime_ratio.split('-')[2]).toFixed(2) : null
      },
      responseTime: {
        average: monitor.average_response_time || null,
        recent: (monitor.response_times || []).map(rt => ({
          value: rt.value,
          datetime: new Date(rt.datetime * 1000).toISOString()
        }))
      },
      logs: (monitor.logs || []).slice(0, 5).map(log => ({
        type: getLogType(log.type),
        datetime: new Date(log.datetime * 1000).toISOString(),
        duration: log.duration ? `${Math.round(log.duration / 60)} min` : null,
        reason: log.reason?.detail || null
      }))
    }));
    
    res.json({
      success: true,
      data: {
        configured: true,
        monitors,
        summary: {
          total: monitors.length,
          online: monitors.filter(m => m.statusCode === 2).length,
          offline: monitors.filter(m => m.statusCode === 9).length,
          paused: monitors.filter(m => m.statusCode === 0).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper: status do UptimeRobot
function getUptimeStatus(status) {
  const statuses = {
    0: 'paused',
    1: 'not_checked',
    2: 'online',
    8: 'seems_down',
    9: 'offline'
  };
  return statuses[status] || 'unknown';
}

// Helper: tipo de log do UptimeRobot
function getLogType(type) {
  const types = {
    1: 'down',
    2: 'up',
    98: 'started',
    99: 'paused'
  };
  return types[type] || 'unknown';
}

module.exports = router;
