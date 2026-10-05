const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../database/connection');
const { 
  authenticate, 
  generateAccessToken, 
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  setTokenCookies,
  clearTokenCookies,
} = require('../middlewares/auth');
const { loginLimiter, sensitiveLimiter } = require('../middlewares/rateLimiter.middleware');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

// Schema de validação para login
const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(200, 'Email muito longo')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .max(100, 'Senha muito longa')
});

// Schema de validação para alteração de senha
const changePasswordSchema = z.object({
  current_password: z.string()
    .min(1, 'Senha atual é obrigatória')
    .max(100, 'Senha muito longa'),
  new_password: z.string()
    .min(6, 'Nova senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa')
});

// Login (com rate limiting restritivo + validação Zod)
router.post('/login', loginLimiter, validateRequest(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await db('users').where({ email, active: true }).first();

    if (!user) {
      // Log de tentativa de login falha
      await db('audit_logs').insert({
        tenant_id: null,
        action: 'LOGIN_FAILED',
        entity_type: 'USER',
        entity_id: null,
        description: `Tentativa de login falha para email: ${email}`,
        performed_by: email,
      }).catch(err => console.error('Erro ao logar tentativa de login:', err.message));
      
      return res.status(401).json({
        success: false,
        error: { message: 'Email ou senha incorretos' },
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      // Log de tentativa de login falha (senha incorreta)
      await db('audit_logs').insert({
        tenant_id: user.tenant_id,
        action: 'LOGIN_FAILED',
        entity_type: 'USER',
        entity_id: user.id,
        description: `Tentativa de login falha (senha incorreta) para: ${email}`,
        performed_by: email,
      }).catch(err => console.error('Erro ao logar tentativa de login:', err.message));
      
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

    // Gera Access Token (curta duração)
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    // Gera Refresh Token (longa duração)
    const { token: refreshToken, expiresAt } = await generateRefreshToken(user.id, user.tenant_id, req);

    // Define cookies httpOnly
    setTokenCookies(res, accessToken, refreshToken, expiresAt);
    
    // Log de login bem sucedido
    await db('audit_logs').insert({
      tenant_id: user.tenant_id,
      action: 'LOGIN',
      entity_type: 'USER',
      entity_id: user.id,
      description: `Login realizado com sucesso: ${email}`,
      performed_by: email,
    }).catch(err => console.error('Erro ao logar login:', err.message));

    res.json({
      success: true,
      data: {
        token: accessToken, // Mantém para compatibilidade
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

// Refresh Token - gera novo access token
router.post('/refresh', async (req, res, next) => {
  try {
    // Obtém refresh token do cookie ou body
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token não fornecido' },
      });
    }

    // Valida refresh token
    const tokenData = await validateRefreshToken(refreshToken);

    if (!tokenData) {
      clearTokenCookies(res);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido ou expirado' },
      });
    }

    // Busca usuário
    const user = await db('users').where({ id: tokenData.user_id, active: true }).first();

    if (!user) {
      await revokeRefreshToken(refreshToken);
      clearTokenCookies(res);
      return res.status(401).json({
        success: false,
        error: { message: 'Usuário não encontrado ou inativo' },
      });
    }

    // Verifica tenant (se aplicável)
    if (tokenData.tenant_id) {
      const tenant = await db('tenants').where({ id: tokenData.tenant_id, active: true }).first();
      if (!tenant) {
        await revokeRefreshToken(refreshToken);
        clearTokenCookies(res);
        return res.status(403).json({
          success: false,
          error: { message: 'Conta desativada' },
        });
      }
    }

    // Gera novo access token
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: tokenData.tenant_id || user.tenant_id,
      role: user.role,
      email: user.email,
    });

    // Atualiza cookie do access token
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout - revoga refresh token
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    clearTokenCookies(res);

    res.json({
      success: true,
      data: { message: 'Logout realizado com sucesso' },
    });
  } catch (error) {
    next(error);
  }
});

// Logout de todos os dispositivos
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user.userId);
    clearTokenCookies(res);

    res.json({
      success: true,
      data: { message: 'Logout de todos os dispositivos realizado' },
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

// Alterar senha (com rate limiting para operações sensíveis + validação Zod)
router.put('/change-password', authenticate, sensitiveLimiter, validateRequest(changePasswordSchema), async (req, res, next) => {
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
