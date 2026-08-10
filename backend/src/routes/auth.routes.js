const { Router } = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { authenticate, generateToken } = require('../middlewares/auth');
const { loginLimiter, sensitiveLimiter } = require('../middlewares/rateLimiter.middleware');

const router = Router();

// Login (com rate limiting restritivo)
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email e senha são obrigatórios' },
      });
    }

    const user = await db('users').where({ email, active: true }).first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Email ou senha incorretos' },
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: { message: 'Email ou senha incorretos' },
      });
    }

    // Verificar se tenant está ativo (se não for super_admin)
    if (user.tenant_id) {
      const tenant = await db('tenants').where({ id: user.tenant_id, active: true }).first();
      if (!tenant) {
        return res.status(403).json({
          success: false,
          error: { message: 'Conta desativada. Entre em contato com o suporte.' },
        });
      }
    }

    // Atualizar last_login
    await db('users').where({ id: user.id }).update({ last_login: new Date().toISOString() });

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Me — dados do usuário logado
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.user.userId }).first();

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'Usuário não encontrado' } });
    }

    // Usar tenantId do token (importante para impersonate)
    // Durante impersonate, o token tem o tenantId do tenant sendo acessado
    const effectiveTenantId = req.user.tenantId || user.tenant_id;
    
    let tenant = null;
    if (effectiveTenantId) {
      tenant = await db('tenants').where({ id: effectiveTenantId }).first();
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: effectiveTenantId,
        tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, modules: tenant.modules } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Alterar senha (com rate limiting para operações sensíveis)
router.put('/change-password', authenticate, sensitiveLimiter, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await db('users').where({ id: req.user.userId }).first();
    const validPassword = await bcrypt.compare(current_password, user.password_hash);

    if (!validPassword) {
      return res.status(400).json({ success: false, error: { message: 'Senha atual incorreta' } });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: user.id }).update({ password_hash, updated_at: new Date().toISOString() });

    res.json({ success: true, data: { message: 'Senha alterada com sucesso' } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
