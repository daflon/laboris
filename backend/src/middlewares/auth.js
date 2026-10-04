const jwt = require('jsonwebtoken');

// JWT_SECRET obrigatória - sem fallback inseguro
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET não está configurada!');
  console.error('   Configure a variável de ambiente JWT_SECRET antes de iniciar o servidor.');
  process.exit(1);
}

/**
 * Middleware de autenticação — verifica JWT e injeta req.user
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token não fornecido' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, tenantId, role, email }
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token inválido ou expirado' },
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
 * Gera um JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authenticate, superAdminOnly, generateToken };
