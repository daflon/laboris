const clientsService = require('../services/clients.service');
const equipmentService = require('../services/equipment.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const clientsController = {
  async create(req, res, next) {
    try {
      const client = await clientsService.create(req.body);
      res.status(201).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search } = req.query;

      const { clients, total } = await clientsService.findAll({ search, limit, offset });

      res.json({
        success: true,
        data: clients,
        meta: buildPaginationMeta(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  },

  async findById(req, res, next) {
    try {
      const client = await clientsService.findById(req.params.id);
      const equipment = await equipmentService.findByClientId(req.params.id);

      res.json({
        success: true,
        data: { ...client, equipment },
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const client = await clientsService.update(req.params.id, req.body);
      res.json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await clientsService.delete(req.params.id);
      res.json({ success: true, data: { message: 'Cliente removido com sucesso' } });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = clientsController;
