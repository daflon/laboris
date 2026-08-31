/**
 * Extrai e normaliza parâmetros de paginação da query string
 */
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  // Limite máximo aumentado para 10000 (selects de formulários precisam carregar todos)
  const limit = Math.min(10000, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Monta objeto de metadados de paginação
 */
function buildPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { getPaginationParams, buildPaginationMeta };
