const crypto = require('crypto');
const db = require('../database/connection');

const TABLE = 'technicians';

const techniciansRepository = {
  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record = { id, ...data, created_at: now, updated_at: now };
    await db(TABLE).insert(record);
    return record;
  },

  async findAll({ search, status, limit, offset }) {
    const query = db(TABLE).whereNull('deleted_at');

    if (status === 'active') {
      query.where('active', true);
    } else if (status === 'inactive') {
      query.where('active', false);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw('LOWER(name) LIKE ?', [term])
          .orWhereRaw('LOWER(specialty) LIKE ?', [term]);
      });
    }

    const [{ count }] = await query.clone().count('* as count');
    const technicians = await query
      .select('*')
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    return { technicians, total: parseInt(count) };
  },

  async findById(id) {
    return db(TABLE).where({ id }).whereNull('deleted_at').first();
  },

  async update(id, data) {
    const now = new Date().toISOString();
    await db(TABLE)
      .where({ id })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: now });
    return this.findById(id);
  },

  async toggleStatus(id) {
    const technician = await this.findById(id);
    if (!technician) return null;
    const now = new Date().toISOString();
    await db(TABLE)
      .where({ id })
      .whereNull('deleted_at')
      .update({ active: !technician.active, updated_at: now });
    return this.findById(id);
  },

  async softDelete(id) {
    const now = new Date().toISOString();
    await db(TABLE)
      .where({ id })
      .whereNull('deleted_at')
      .update({ deleted_at: now });
  },
};

module.exports = techniciansRepository;
