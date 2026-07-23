const db = require('../database/connection');

const TABLE = 'clients';

const clientsRepository = {
  async create(tenantId, data) {
    const [client] = await db(TABLE)
      .insert({ ...data, tenant_id: tenantId })
      .returning('*');
    return client;
  },

  async findAll(tenantId, { search, limit, offset }) {
    const query = db(TABLE).where({ tenant_id: tenantId }).whereNull('deleted_at');

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw('LOWER(name) LIKE ?', [term])
          .orWhere('document', 'like', `%${search}%`)
          .orWhere('phone', 'like', `%${search.replace(/\D/g, '')}%`);
      });
    }

    const [{ count }] = await query.clone().count('* as count');
    const clients = await query
      .select('*')
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    return { clients, total: parseInt(count) };
  },

  async findById(tenantId, id) {
    return db(TABLE).where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  },

  async findByDocument(tenantId, document) {
    return db(TABLE).where({ document, tenant_id: tenantId }).whereNull('deleted_at').first();
  },

  async update(tenantId, id, data) {
    const [client] = await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: new Date().toISOString() })
      .returning('*');
    return client;
  },

  async softDelete(tenantId, id) {
    await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({ deleted_at: new Date().toISOString() });
  },
};

module.exports = clientsRepository;
