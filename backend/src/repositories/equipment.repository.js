const db = require('../database/connection');

const TABLE = 'equipment';

const equipmentRepository = {
  async create(tenantId, data) {
    const [equipment] = await db(TABLE)
      .insert({ ...data, tenant_id: tenantId })
      .returning('*');
    return equipment;
  },

  async findAll(tenantId, { search, client_id, limit, offset }) {
    const query = db(TABLE)
      .where(`${TABLE}.tenant_id`, tenantId)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`);

    if (client_id) query.where(`${TABLE}.client_id`, client_id);

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw(`LOWER(${TABLE}.brand) LIKE ?`, [term])
          .orWhereRaw(`LOWER(${TABLE}.model) LIKE ?`, [term])
          .orWhereRaw(`LOWER(${TABLE}.serial_number) LIKE ?`, [term])
          .orWhereRaw(`LOWER(${TABLE}.type) LIKE ?`, [term])
          .orWhereRaw('LOWER(clients.name) LIKE ?', [term]);
      });
    }

    const [{ count }] = await query.clone().count('* as count');
    const equipment = await query
      .select(`${TABLE}.*`, 'clients.name as client_name')
      .orderBy(`${TABLE}.created_at`, 'desc')
      .limit(limit)
      .offset(offset);

    return { equipment, total: parseInt(count) };
  },

  async findById(tenantId, id) {
    return db(TABLE).where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  },

  async findByClientId(tenantId, clientId) {
    return db(TABLE)
      .where({ client_id: clientId, tenant_id: tenantId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');
  },

  async update(tenantId, id, data) {
    const [equipment] = await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: new Date().toISOString() })
      .returning('*');
    return equipment;
  },

  async softDelete(tenantId, id) {
    await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({ deleted_at: new Date().toISOString() });
  },
};

module.exports = equipmentRepository;
