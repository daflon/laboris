const crypto = require('crypto');
const db = require('../database/connection');

const TABLE = 'equipment';

const equipmentRepository = {
  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record = { id, ...data, created_at: now, updated_at: now };
    await db(TABLE).insert(record);
    return record;
  },

  async findAll({ search, client_id, limit, offset }) {
    const query = db(TABLE)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`);

    if (client_id) {
      query.where(`${TABLE}.client_id`, client_id);
    }

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

  async findById(id) {
    return db(TABLE).where({ id }).whereNull('deleted_at').first();
  },

  async findByClientId(clientId) {
    return db(TABLE)
      .where({ client_id: clientId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');
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

module.exports = equipmentRepository;
