const companySettingsRepository = require('../repositories/companySettings.repository');

const companySettingsController = {
  async get(req, res, next) {
    try {
      const settings = await companySettingsRepository.get(req.tenantId);
      res.json({ success: true, data: settings || null });
    } catch (error) { next(error); }
  },
  async upsert(req, res, next) {
    try {
      console.log('[CompanySettings] Atualizando tenant:', req.tenantId);
      console.log('[CompanySettings] Body keys:', Object.keys(req.body));
      console.log('[CompanySettings] Logo size:', req.body.logo_url ? req.body.logo_url.length : 0);
      
      const settings = await companySettingsRepository.upsert(req.tenantId, req.body);
      console.log('[CompanySettings] Salvo com sucesso');
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('[CompanySettings] Erro:', error.message);
      next(error);
    }
  },
};

module.exports = companySettingsController;
