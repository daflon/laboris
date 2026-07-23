const equipmentService = require('../services/equipment.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const equipmentController = {
  async create(req, res, next) {
    try { res.status(201).json({ success: true, data: await equipmentService.create(req.tenantId, req.body) }); }
    catch (error) { next(error); }
  },
  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search, client_id } = req.query;
      const { equipment, total } = await equipmentService.findAll(req.tenantId, { search, client_id, limit, offset });
      res.json({ success: true, data: equipment, meta: buildPaginationMeta(page, limit, total) });
    } catch (error) { next(error); }
  },
  async findById(req, res, next) {
    try { res.json({ success: true, data: await equipmentService.findById(req.tenantId, req.params.id) }); }
    catch (error) { next(error); }
  },
  async findByClientId(req, res, next) {
    try { res.json({ success: true, data: await equipmentService.findByClientId(req.tenantId, req.params.id) }); }
    catch (error) { next(error); }
  },
  async update(req, res, next) {
    try { res.json({ success: true, data: await equipmentService.update(req.tenantId, req.params.id, req.body) }); }
    catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try { await equipmentService.delete(req.tenantId, req.params.id); res.json({ success: true, data: { message: 'Equipamento removido' } }); }
    catch (error) { next(error); }
  },
};

module.exports = equipmentController;
