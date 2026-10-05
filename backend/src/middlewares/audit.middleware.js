/**
 * Middleware de Auditoria Automática
 * Registra operações críticas automaticamente na tabela audit_logs
 */

const db = require('../database/connection');

// Ações que devem ser auditadas automaticamente
const AUDITABLE_ACTIONS = {
  // Auth
  'POST /api/v1/auth/login': 'LOGIN',
  'PUT /api/v1/auth/change-password': 'CHANGE_PASSWORD',
  
  // Clients
  'POST /api/v1/clients': 'CREATE_CLIENT',
  'PUT /api/v1/clients/:id': 'UPDATE_CLIENT',
  'DELETE /api/v1/clients/:id': 'DELETE_CLIENT',
  
  // Equipment
  'POST /api/v1/equipment': 'CREATE_EQUIPMENT',
  'PUT /api/v1/equipment/:id': 'UPDATE_EQUIPMENT',
  'DELETE /api/v1/equipment/:id': 'DELETE_EQUIPMENT',
  
  // Service Orders
  'POST /api/v1/service-orders': 'CREATE_SERVICE_ORDER',
  'PUT /api/v1/service-orders/:id': 'UPDATE_SERVICE_ORDER',
  'PATCH /api/v1/service-orders/:id/status': 'UPDATE_SERVICE_ORDER_STATUS',
  'DELETE /api/v1/service-orders/:id': 'DELETE_SERVICE_ORDER',
  
  // Technicians
  'POST /api/v1/technicians': 'CREATE_TECHNICIAN',
  'PUT /api/v1/technicians/:id': 'UPDATE_TECHNICIAN',
  'DELETE /api/v1/technicians/:id': 'DELETE_TECHNICIAN',
  
  // Admin/Company
  'PUT /api/v1/company': 'UPDATE_COMPANY_SETTINGS',
  'PUT /api/v1/admin/pin': 'UPDATE_ADMIN_PIN',
  
  // Financeiro
  'POST /api/v1/financeiro': 'CREATE_FINANCIAL_ENTRY',
  'PUT /api/v1/financeiro/:id': 'UPDATE_FINANCIAL_ENTRY',
  'DELETE /api/v1/financeiro/:id': 'DELETE_FINANCIAL_ENTRY',
  
  // Aluguéis
  'POST /api/v1/alugueis': 'CREATE_ALUGUEL',
  'PUT /api/v1/alugueis/:id': 'UPDATE_ALUGUEL',
  'DELETE /api/v1/alugueis/:id': 'DELETE_ALUGUEL',
  
  // Master (super admin)
  'POST /api/v1/master/tenants': 'CREATE_TENANT',
  'PUT /api/v1/master/tenants/:id': 'UPDATE_TENANT',
  'PATCH /api/v1/master/tenants/:id/toggle': 'TOGGLE_TENANT_STATUS',
  'POST /api/v1/master/tenants/:id/impersonate': 'IMPERSONATE_TENANT',
  'PUT /api/v1/master/tenants/:id/reset-password': 'RESET_USER_PASSWORD',
};

/**
 * Normaliza o path para matching (substitui IDs por :id)
 */
function normalizePath(path) {
  // Remove query string
  const pathOnly = path.split('?')[0];
  // Substitui UUIDs e números por :id
  return pathOnly
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Extrai o ID da entidade do path
 */
function extractEntityId(path) {
  const uuidMatch = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) return uuidMatch[0];
  
  const numMatch = path.match(/\/(\d+)(?:\/|$)/);
  if (numMatch) return numMatch[1];
  
  return null;
}

/**
 * Extrai o tipo de entidade do path
 */
function extractEntityType(path) {
  const pathParts = path.split('/').filter(Boolean);
  // /api/v1/clients/123 -> clients
  if (pathParts.length >= 3) {
    return pathParts[2].toUpperCase().replace(/-/g, '_');
  }
  return null;
}

/**
 * Middleware de auditoria - executa APÓS a resposta
 */
function auditMiddleware(req, res, next) {
  // Captura o tempo de início
  const startTime = Date.now();
  
  // Intercepta o fim da response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Restaura o método original
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Processa auditoria de forma assíncrona (não bloqueia a response)
    setImmediate(() => {
      try {
        const normalizedPath = normalizePath(req.path);
        const routeKey = `${req.method} ${normalizedPath}`;
        const action = AUDITABLE_ACTIONS[routeKey];
        
        // Se não é uma ação auditável, ignora
        if (!action) return;
        
        // Só audita se a operação foi bem-sucedida (2xx) ou se foi login falho
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        const isFailedLogin = action === 'LOGIN' && res.statusCode === 401;
        
        if (!isSuccess && !isFailedLogin) return;
        
        const tenantId = req.tenantId || req.user?.tenantId || null;
        const userId = req.user?.userId || null;
        const userEmail = req.user?.email || req.body?.email || 'anonymous';
        const entityId = extractEntityId(req.path);
        const entityType = extractEntityType(req.path);
        const duration = Date.now() - startTime;
        
        // Monta descrição
        let description = `${action}`;
        if (entityId) description += ` [${entityType}:${entityId}]`;
        if (isFailedLogin) description = 'LOGIN_FAILED';
        description += ` - ${res.statusCode} (${duration}ms)`;
        
        // Dados sensíveis que não devem ser logados
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.current_password;
        delete sanitizedBody.new_password;
        delete sanitizedBody.image_data;
        delete sanitizedBody.logo_url;
        
        // Insere no banco de forma assíncrona
        db('audit_logs').insert({
          tenant_id: tenantId,
          action: isFailedLogin ? 'LOGIN_FAILED' : action,
          entity_type: entityType,
          entity_id: entityId,
          description: description,
          performed_by: userEmail,
          ip_address: req.ip || req.connection?.remoteAddress,
          user_agent: req.get('User-Agent')?.substring(0, 255),
          request_body: Object.keys(sanitizedBody).length > 0 ? JSON.stringify(sanitizedBody).substring(0, 1000) : null,
          response_status: res.statusCode,
          duration_ms: duration,
        }).catch(err => {
          // Log silencioso - não deve quebrar a aplicação
          console.error('Erro ao registrar audit log:', err.message);
        });
        
      } catch (err) {
        console.error('Erro no middleware de auditoria:', err.message);
      }
    });
  };
  
  next();
}

module.exports = auditMiddleware;
