const equipmentService = require('../services/equipment.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const equipmentController = {
  async create(req, res, next) {
    try {
      const equipment = await equipmentService.create(req.body);
      res.status(201).json({ success: true, data: equipment });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search, client_id } = req.query;

      const { equipment, total } = await equipmentService.findAll({
        search,
        client_id,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: equipment,
        meta: buildPaginationMeta(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  },

  async findById(req, res, next) {
    try {
      const equipment = await equipmentService.findById(req.params.id);
      res.json({ success: true, data: equipment });
    } catch (error) {
      next(error);
    }
  },

  async findByClientId(req, res, next) {
    try {
      const equipment = await equipmentService.findByClientId(req.params.id);
      res.json({ success: true, data: equipment });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const equipment = await equipmentService.update(req.params.id, req.body);
      res.json({ success: true, data: equipment });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await equipmentService.delete(req.params.id);
      res.json({ success: true, data: { message: 'Equipamento removido com sucesso' } });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = equipmentController;
