const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/connection');

// JWT_SECRET obrigatória - sem fallback inseguro
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET não está configurada!');
  console.error('   Configure a variável de ambiente JWT_SECRET antes de iniciar o servidor.');
  process.exit(1);
}

// Configurações de tokens
const ACCESS_TOKEN_EXPIRY = '15m';  // Token de acesso: 15 minutos
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Refresh token: 7 dias

/**
 * Middleware de autenticação — verifica JWT (header ou cookie) e injeta req.user
 */
function authenticate(req, res, next) {
  // Tenta obter token do header Authorization ou do cookie
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token não fornecido' },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, tenantId, role, email }
    req.tenantId = decoded.tenantId;
    req.userRole = decoded.role; // Para o rate limiter
    next();
  } catch (err) {
    // Token expirado - frontend deve usar refresh token
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token inválido' },
    });
  }
}

/**
 * Middleware que restringe acesso ao super_admin
 */
function superAdminOnly(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Acesso restrito ao administrador' },
    });
  }
  next();
}

/**
 * Gera um Access Token JWT (curta duração)
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Gera um Refresh Token (longa duração, armazenado no banco)
 */
async function generateRefreshToken(userId, tenantId, req) {
  // Gera token aleatório
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Calcula expiração
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  
  // Extrai info do dispositivo
  const userAgent = req.get('User-Agent') || 'unknown';
  const deviceInfo = userAgent.substring(0, 255);
  const ipAddress = req.ip || req.connection?.remoteAddress;
  
  // Salva no banco
  await db('refresh_tokens').insert({
    user_id: userId,
    tenant_id: tenantId,
    token_hash: tokenHash,
    device_info: deviceInfo,
    ip_address: ipAddress,
    expires_at: expiresAt,
  });
  
  return { token, expiresAt };
}

/**
 * Valida um Refresh Token
 */
async function validateRefreshToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const refreshToken = await db('refresh_tokens')
    .where({ token_hash: tokenHash })
    .whereNull('revoked_at')
    .where('expires_at', '>', new Date())
    .first();
  
  if (!refreshToken) {
    return null;
  }
  
  return refreshToken;
}

/**
 * Revoga um Refresh Token
 */
async function revokeRefreshToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await db('refresh_tokens')
    .where({ token_hash: tokenHash })
    .update({ revoked_at: new Date() });
}

/**
 * Revoga todos os Refresh Tokens de um usuário (logout de todos os dispositivos)
 */
async function revokeAllUserTokens(userId) {
  await db('refresh_tokens')
    .where({ user_id: userId })
    .whereNull('revoked_at')
    .update({ revoked_at: new Date() });
}

/**
 * Limpa tokens expirados (pode ser chamado periodicamente)
 */
async function cleanupExpiredTokens() {
  const deleted = await db('refresh_tokens')
    .where('expires_at', '<', new Date())
    .del();
  return deleted;
}

/**
 * Define cookies httpOnly para os tokens
 */
function setTokenCookies(res, accessToken, refreshToken, refreshExpiresAt) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Cookie do Access Token (curta duração)
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction, // HTTPS only em produção
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutos
    path: '/',
  });
  
  // Cookie do Refresh Token (longa duração)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 dias
    path: '/api/v1/auth', // Apenas para rotas de auth
  });
}

/**
 * Remove cookies de tokens (logout)
 */
function clearTokenCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth' });
}

// Mantém compatibilidade com código antigo
function generateToken(payload) {
  return generateAccessToken(payload);
}

module.exports = { 
  authenticate, 
  superAdminOnly, 
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  setTokenCookies,
  clearTokenCookies,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS,
};
