const db = require('../database/connection');

const TABLE = 'technicians';

const techniciansRepository = {
  async create(tenantId, data) {
    const [technician] = await db(TABLE)
      .insert({ ...data, tenant_id: tenantId })
      .returning('*');
    return technician;
  },

  async findAll(tenantId, { search, status, limit, offset }) {
    const query = db(TABLE).where({ tenant_id: tenantId }).whereNull('deleted_at');

    if (status === 'active') query.where('active', true);
    else if (status === 'inactive') query.where('active', false);

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw('LOWER(name) LIKE ?', [term])
          .orWhereRaw('LOWER(specialty) LIKE ?', [term]);
      });
    }

    const [{ count }] = await query.clone().count('* as count');
    const technicians = await query.select('*').orderBy('name', 'asc').limit(limit).offset(offset);

    return { technicians, total: parseInt(count) };
  },

  async findById(tenantId, id) {
    return db(TABLE).where({ id, tenant_id: tenantId }).whereNull('deleted_at').first();
  },

  async update(tenantId, id, data) {
    const [technician] = await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: new Date().toISOString() })
      .returning('*');
    return technician;
  },

  async toggleStatus(tenantId, id) {
    const tech = await this.findById(tenantId, id);
    if (!tech) return null;
    const [updated] = await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .update({ active: !tech.active, updated_at: new Date().toISOString() })
      .returning('*');
    return updated;
  },

  async softDelete(tenantId, id) {
    await db(TABLE)
      .where({ id, tenant_id: tenantId })
      .whereNull('deleted_at')
      .update({ deleted_at: new Date().toISOString() });
  },
};

module.exports = techniciansRepository;
