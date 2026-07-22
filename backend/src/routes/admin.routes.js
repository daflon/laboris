const { Router } = require('express');
const crypto = require('crypto');
const db = require('../database/connection');
const companySettingsRepository = require('../repositories/companySettings.repository');

const router = Router();

// Verificar PIN
router.post('/verify-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: { message: 'PIN é obrigatório' } });
    }

    const company = await companySettingsRepository.get();

    // Se não tem PIN cadastrado, aceita '0000' como padrão
    const adminPin = company && company.admin_pin ? company.admin_pin : '0000';

    if (pin !== adminPin) {
      return res.status(403).json({ success: false, error: { message: 'PIN incorreto' } });
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
