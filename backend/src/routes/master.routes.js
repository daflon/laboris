const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { authenticate, superAdminOnly } = require('../middlewares/auth');

const router = Router();

// Todas as rotas do master requerem super_admin
router.use(authenticate, superAdminOnly);

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
  } catch (error) {
    next(error);
  }
});

module.exports = router;
