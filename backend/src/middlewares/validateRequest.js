/**
 * Middleware genérico de validação usando Zod
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details,
        },
      });
    }

    req.body = result.data;
    next();
  };
}

module.exports = validateRequest;
