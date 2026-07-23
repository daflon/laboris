const db = require('../database/connection');

const TABLE = 'company_settings';

const companySettingsRepository = {
  async get(tenantId) {
    return db(TABLE).where({ tenant_id: tenantId }).first();
  },

  async upsert(tenantId, data) {
    const existing = await this.get(tenantId);

    if (existing) {
      await db(TABLE)
        .where({ tenant_id: tenantId })
        .update({ ...data, updated_at: new Date().toISOString() });
      return this.get(tenantId);
    }

    const [record] = await db(TABLE)
      .insert({ ...data, tenant_id: tenantId })
      .returning('*');
    return record;
  },
};

module.exports = companySettingsRepository;
