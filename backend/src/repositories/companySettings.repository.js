const crypto = require('crypto');
const db = require('../database/connection');

const TABLE = 'company_settings';

const companySettingsRepository = {
  async get() {
    return db(TABLE).first();
  },

  async upsert(data) {
    const existing = await this.get();
    const now = new Date().toISOString();

    if (existing) {
      await db(TABLE)
        .where({ id: existing.id })
        .update({ ...data, updated_at: now });
      return this.get();
    }

    const id = crypto.randomUUID();
    const record = { id, ...data, created_at: now, updated_at: now };
    await db(TABLE).insert(record);
    return record;
  },
};

module.exports = companySettingsRepository;
