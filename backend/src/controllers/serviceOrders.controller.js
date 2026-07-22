const serviceOrdersService = require('../services/serviceOrders.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

const serviceOrdersController = {
  async create(req, res, next) {
    try {
      const order = await serviceOrdersService.create(req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search, status } = req.query;

      const { orders, total } = await serviceOrdersService.findAll({
        search,
        status,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: orders,
        meta: buildPaginationMeta(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  },

  async findById(req, res, next) {
    try {
      const order = await serviceOrdersService.findById(req.params.id);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const order = await serviceOrdersService.update(req.params.id, req.body);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const order = await serviceOrdersService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await serviceOrdersService.delete(req.params.id);
      res.json({ success: true, data: { message: 'Ordem de Serviço removida com sucesso' } });
    } catch (error) {
      next(error);
    }
  },

  async duplicate(req, res, next) {
    try {
      const original = await serviceOrdersService.findById(req.params.id);
      const newOrder = await serviceOrdersService.create({
        client_id: original.client_id,
        equipment_id: original.equipment_id,
        technician_id: original.technician_id,
        status: 'aberta',
        reported_defect: original.reported_defect || '',
        diagnosis: '',
        notes: `Duplicada da OS #${String(original.order_number).padStart(4, '0')}`,
        payment_method: original.payment_method || '',
        warranty_days: original.warranty_days || 90,
        entry_date: new Date().toISOString().split('T')[0],
        items: (original.items || []).map((item) => ({
          quantity: item.quantity,
          description: item.description,
          unit_price: item.unit_price,
        })),
      });
      res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
      next(error);
    }
  },

  async findByEquipmentId(req, res, next) {
    try {
      const orders = await serviceOrdersService.findByEquipmentId(req.params.id);
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = serviceOrdersController;
