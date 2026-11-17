const db = require('../database/connection');

const TABLE = 'os_status_history';

const statusHistoryRepository = {
  /**
   * Registra uma mudança de status
   */
  async create(tenantId, serviceOrderId, fromStatus, toStatus) {
    const [record] = await db(TABLE).insert({
      tenant_id: tenantId,
      service_order_id: serviceOrderId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_at: new Date().toISOString(),
    }).returning('*');
    
    return record;
  },

  /**
   * Busca histórico de uma OS ordenado por data
   */
  async findByServiceOrderId(tenantId, serviceOrderId) {
    return db(TABLE)
      .where({ tenant_id: tenantId, service_order_id: serviceOrderId })
      .orderBy('changed_at', 'asc');
  },

  /**
   * Conta quantas mudanças de status uma OS teve
   */
  async countByServiceOrderId(tenantId, serviceOrderId) {
    const [{ count }] = await db(TABLE)
      .where({ tenant_id: tenantId, service_order_id: serviceOrderId })
      .count('* as count');
    return parseInt(count);
  },
};

module.exports = statusHistoryRepository;
