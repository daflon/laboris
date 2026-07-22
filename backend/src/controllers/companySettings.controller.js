const companySettingsRepository = require('../repositories/companySettings.repository');

const companySettingsController = {
  async get(req, res, next) {
    try {
      const settings = await companySettingsRepository.get();
      res.json({ success: true, data: settings || null });
    } catch (error) {
      next(error);
    }
  },

  async upsert(req, res, next) {
    try {
      const settings = await companySettingsRepository.upsert(req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = companySettingsController;
