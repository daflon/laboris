const techniciansService = require('../services/technicians.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const techniciansController = {
  async create(req, res, next) {
    try {
      const technician = await techniciansService.create(req.body);
      res.status(201).json({ success: true, data: technician });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search, status } = req.query;

      const { technicians, total } = await techniciansService.findAll({
        search,
        status,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: technicians,
        meta: buildPaginationMeta(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  },

  async findById(req, res, next) {
    try {
      const technician = await techniciansService.findById(req.params.id);
      res.json({ success: true, data: technician });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const technician = await techniciansService.update(req.params.id, req.body);
      res.json({ success: true, data: technician });
    } catch (error) {
      next(error);
    }
  },

  async toggleStatus(req, res, next) {
    try {
      const technician = await techniciansService.toggleStatus(req.params.id);
      res.json({ success: true, data: technician });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await techniciansService.delete(req.params.id);
      res.json({ success: true, data: { message: 'Técnico removido com sucesso' } });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = techniciansController;
