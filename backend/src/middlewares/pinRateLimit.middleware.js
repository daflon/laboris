/**
 * Middleware de Rate Limiting para PIN
 * Bloqueia combinação tenant_id + IP após 5 tentativas incorretas
 * Cooldown de 5 minutos
 */

const db = require('../database/connection');

const PIN_MAX_ATTEMPTS = 5;
const PIN_COOLDOWN_MINUTES = 5;

/**
 * Verifica se o tenant+IP está bloqueado
 */
async function isBlocked(tenantId, ipAddress) {
  const cooldownTime = new Date(Date.now() - PIN_COOLDOWN_MINUTES * 60 * 1000);
  
  const failedAttempts = await db('pin_attempts')
    .where('tenant_id', tenantId)
    .where('ip_address', ipAddress)
    .where('attempted_at', '>=', cooldownTime)
    .where('success', false)
    .count('id as count')
    .first();
  
  return parseInt(failedAttempts.count) >= PIN_MAX_ATTEMPTS;
}

/**
 * Registra uma tentativa de PIN
 */
async function recordAttempt(tenantId, ipAddress, success) {
  await db('pin_attempts').insert({
    tenant_id: tenantId,
    ip_address: ipAddress,
    success: success,
    attempted_at: new Date()
  });
}

/**
 * Limpa tentativas antigas (> 24h)
 * Chamar periodicamente ou em cada request
 */
async function cleanupOldAttempts() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db('pin_attempts')
    .where('attempted_at', '<', oneDayAgo)
    .delete();
}

/**
 * Middleware que verifica rate limit antes de validar PIN
 */
function pinRateLimitMiddleware(req, res, next) {
  // O PIN será verificado no controller, este middleware só prepara o contexto
  req.pinRateLimit = {
    isBlocked,
    recordAttempt,
    cleanupOldAttempts
  };
  next();
}

/**
 * Valida PIN com rate limiting
 * Usar no controller ao invés de validação direta
 */
async function validatePinWithRateLimit(tenantId, ipAddress, providedPin, correctPinHash) {
  // Limpar tentativas antigas (1% de chance para não rodar sempre)
  if (Math.random() < 0.01) {
    cleanupOldAttempts().catch(() => {});
  }
  
  // Verificar se está bloqueado
  const blocked = await isBlocked(tenantId, ipAddress);
  if (blocked) {
    return {
      success: false,
      error: 'Não foi possível validar. Tente novamente mais tarde.',
      blocked: true
    };
  }
  
  // Validar PIN
  const bcrypt = require('bcryptjs');
  const isValid = await bcrypt.compare(providedPin, correctPinHash);
  
  // Registrar tentativa
  await recordAttempt(tenantId, ipAddress, isValid);
  
  if (!isValid) {
    return {
      success: false,
      error: 'Não foi possível validar. Tente novamente mais tarde.',
      blocked: false
    };
  }
  
  return { success: true };
}

/**
 * Extrai IP do request (considera proxies)
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] 
    || req.connection?.remoteAddress 
    || req.ip 
    || 'unknown';
}

module.exports = {
  pinRateLimitMiddleware,
  validatePinWithRateLimit,
  getClientIp,
  isBlocked,
  recordAttempt,
  cleanupOldAttempts
};
