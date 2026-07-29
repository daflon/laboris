const { Router } = require('express');
const crypto = require('crypto');
const db = require('../database/connection');
const companySettingsRepository = require('../repositories/companySettings.repository');
const { validatePinWithRateLimit, getClientIp } = require('../middlewares/pinRateLimit.middleware');

const router = Router();

// Verificar PIN (com rate limiting)
router.post('/verify-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: { message: 'PIN é obrigatório' } });
    }

    const company = await companySettingsRepository.get(req.tenantId);

    // Se não tem PIN cadastrado, aceita '0000' como padrão
    const adminPin = company && company.admin_pin ? company.admin_pin : '0000';
    
    // Obter IP do cliente
    const clientIp = getClientIp(req);
    
    // Validar com rate limiting
    // Nota: PIN ainda está em texto plano no banco, comparação direta
    // Para produção ideal, deveria ser hash com bcrypt
    const isValid = pin === adminPin;
    
    // Registrar tentativa
    try {
      await db('pin_attempts').insert({
        tenant_id: req.tenantId,
        ip_address: clientIp,
        success: isValid,
        attempted_at: new Date()
      });
    } catch (e) {
      // Tabela pode não existir ainda, ignorar erro
      console.warn('Erro ao registrar tentativa de PIN:', e.message);
    }
    
    // Verificar se está bloqueado
    try {
      const cooldownTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos
      const failedAttempts = await db('pin_attempts')
        .where('tenant_id', req.tenantId)
        .where('ip_address', clientIp)
        .where('attempted_at', '>=', cooldownTime)
        .where('success', false)
        .count('id as count')
        .first();
      
      if (parseInt(failedAttempts.count) >= 5) {
        // Mensagem genérica - não revela se é bloqueio ou PIN errado
        return res.status(403).json({ 
          success: false, 
          error: { message: 'Não foi possível validar. Tente novamente mais tarde.' } 
        });
      }
    } catch (e) {
      // Tabela pode não existir ainda, ignorar erro
    }

    if (!isValid) {
      // Mensagem genérica - igual à de bloqueio
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Não foi possível validar. Tente novamente mais tarde.' } 
      });
    }

    res.json({ success: true, data: { verified: true } });
  } catch (error) {
    next(error);
  }
});

// Registrar log de auditoria
router.post('/audit-log', async (req, res, next) => {
  try {
    const { action, entity_type, entity_id, description, performed_by } = req.body;

    const log = {
      id: crypto.randomUUID(),
      action,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      description: description || null,
      performed_by: performed_by || 'admin',
      created_at: new Date().toISOString(),
    };

    await db('audit_logs').insert(log);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

// Listar logs de auditoria
router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await db('audit_logs')
      .orderBy('created_at', 'desc')
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
