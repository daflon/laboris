/**
 * Middleware global de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message, err.stack);

  // Erro de constraint unique (PostgreSQL)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Registro duplicado. Já existe um cadastro com esses dados.',
      },
    });
  }

  // Erro de FK violada
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FOREIGN_KEY_ERROR',
        message: 'Referência inválida. O registro associado não existe.',
      },
    });
  }

  // Erro customizado com statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
      },
    });
  }

  // Erro genérico
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
    },
  });
}

module.exports = errorHandler;
