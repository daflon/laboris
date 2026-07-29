const rateLimit = require('express-rate-limit');

/**
 * Rate limiters para proteção contra DDoS e abuso
 */

// Mensagem padrão de erro
const rateLimitMessage = {
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Muitas requisições. Tente novamente em alguns segundos.'
  }
};

// Login - mais restritivo (proteção contra brute force)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 tentativas por minuto
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas tentativas de login. Aguarde 1 minuto.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Combina IP + email para limitar por conta
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  }
});

// API geral - moderado
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não limita super_admin (pode precisar fazer muitas operações)
    return req.userRole === 'super_admin';
  }
});

// Rotas públicas - básico
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false
});

// Operações sensíveis (exclusões, etc) - muito restritivo
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 operações por minuto
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas operações sensíveis. Aguarde 1 minuto.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  apiLimiter,
  publicLimiter,
  sensitiveLimiter
};
