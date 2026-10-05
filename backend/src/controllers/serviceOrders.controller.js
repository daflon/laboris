const serviceOrdersService = require('../services/serviceOrders.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const db = require('../database/connection');

const serviceOrdersController = {
  async create(req, res, next) {
    try {
      const order = await serviceOrdersService.create(req.tenantId, req.body);
      
      // Log de criação de OS
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'CREATE_OS',
        entity_type: 'SERVICE_ORDER',
        entity_id: order.id,
        description: `OS #${String(order.order_number).padStart(4, '0')} criada`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar criação de OS:', err.message));
      
      res.status(201).json({ success: true, data: order });
    }
    catch (error) { next(error); }
  },
  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search, status, filter } = req.query;
      const { orders, total } = await serviceOrdersService.findAll(req.tenantId, { search, status, filter, limit, offset });
      res.json({ success: true, data: orders, meta: buildPaginationMeta(page, limit, total) });
    } catch (error) { next(error); }
  },
  async findById(req, res, next) {
    try { res.json({ success: true, data: await serviceOrdersService.findById(req.tenantId, req.params.id) }); }
    catch (error) { next(error); }
  },
  async update(req, res, next) {
    try {
      const order = await serviceOrdersService.update(req.tenantId, req.params.id, req.body);
      
      // Log de atualização de OS
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'UPDATE_OS',
        entity_type: 'SERVICE_ORDER',
        entity_id: req.params.id,
        description: `OS #${String(order.order_number).padStart(4, '0')} atualizada`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar atualização de OS:', err.message));
      
      res.json({ success: true, data: order });
    }
    catch (error) { next(error); }
  },
  async updateStatus(req, res, next) {
    try {
      const order = await serviceOrdersService.updateStatus(req.tenantId, req.params.id, req.body.status);
      
      // Log de alteração de status
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'UPDATE_OS_STATUS',
        entity_type: 'SERVICE_ORDER',
        entity_id: req.params.id,
        description: `OS #${String(order.order_number).padStart(4, '0')} - Status alterado para: ${req.body.status}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar alteração de status:', err.message));
      
      res.json({ success: true, data: order });
    }
    catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try {
      // Busca a OS antes de deletar para ter o número
      const order = await serviceOrdersService.findById(req.tenantId, req.params.id);
      await serviceOrdersService.delete(req.tenantId, req.params.id);
      
      // Log de exclusão de OS
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'DELETE_OS',
        entity_type: 'SERVICE_ORDER',
        entity_id: req.params.id,
        description: `OS #${String(order.order_number).padStart(4, '0')} excluída`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar exclusão de OS:', err.message));
      
      res.json({ success: true, data: { message: 'OS removida' } });
    }
    catch (error) { next(error); }
  },
  async duplicate(req, res, next) {
    try {
      const { addToLote } = req.body || {};
      const original = await serviceOrdersService.findById(req.tenantId, req.params.id);
      
      let newOrder;
      if (addToLote) {
        // Duplicar para o mesmo lote
        newOrder = await serviceOrdersService.duplicateToLote(req.tenantId, req.params.id, req.body);
      } else {
        // Duplicar normal (nova OS)
        newOrder = await serviceOrdersService.create(req.tenantId, {
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
          items: (original.items || []).map((item) => ({ quantity: item.quantity, description: item.description, unit_price: item.unit_price })),
        });
      }
      res.status(201).json({ success: true, data: newOrder });
    } catch (error) { next(error); }
  },
  async addToLote(req, res, next) {
    try {
      const newOrder = await serviceOrdersService.addToLote(req.tenantId, req.params.id, req.body);
      res.status(201).json({ success: true, data: newOrder });
    } catch (error) { next(error); }
  },
  async findByEquipmentId(req, res, next) {
    try { res.json({ success: true, data: await serviceOrdersService.findByEquipmentId(req.tenantId, req.params.id) }); }
    catch (error) { next(error); }
  },
};

module.exports = serviceOrdersController;
