const techniciansService = require('../services/technicians.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const techniciansController = {
  async create(req, res, next) {
    try { res.status(201).json({ success: true, data: await techniciansService.create(req.tenantId, req.body) }); }
    catch (error) { next(error); }
  },
  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search, status } = req.query;
      const { technicians, total } = await techniciansService.findAll(req.tenantId, { search, status, limit, offset });
      res.json({ success: true, data: technicians, meta: buildPaginationMeta(page, limit, total) });
    } catch (error) { next(error); }
  },
  async findById(req, res, next) {
    try { res.json({ success: true, data: await techniciansService.findById(req.tenantId, req.params.id) }); }
    catch (error) { next(error); }
  },
  async update(req, res, next) {
    try { res.json({ success: true, data: await techniciansService.update(req.tenantId, req.params.id, req.body) }); }
    catch (error) { next(error); }
  },
  async toggleStatus(req, res, next) {
    try { res.json({ success: true, data: await techniciansService.toggleStatus(req.tenantId, req.params.id) }); }
    catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try { await techniciansService.delete(req.tenantId, req.params.id); res.json({ success: true, data: { message: 'Técnico removido' } }); }
    catch (error) { next(error); }
  },
};

module.exports = techniciansController;
