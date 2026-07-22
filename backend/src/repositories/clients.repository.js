const crypto = require('crypto');
const db = require('../database/connection');

const TABLE = 'clients';

const clientsRepository = {
  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record = { id, ...data, created_at: now, updated_at: now };
    await db(TABLE).insert(record);
    return record;
  },

  async findAll({ search, limit, offset }) {
    const query = db(TABLE).whereNull('deleted_at');

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw('LOWER(name) LIKE ?', [term])
          .orWhere('document', 'like', `%${search}%`);
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

  async findById(id) {
    return db(TABLE).where({ id }).whereNull('deleted_at').first();
  },

  async findByDocument(document) {
    return db(TABLE).where({ document }).whereNull('deleted_at').first();
  },

  async update(id, data) {
    const now = new Date().toISOString();
    await db(TABLE)
      .where({ id })
      .whereNull('deleted_at')
      .update({ ...data, updated_at: now });
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

module.exports = clientsRepository;
