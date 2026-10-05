const equipmentService = require('../services/equipment.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const db = require('../database/connection');

const equipmentController = {
  async create(req, res, next) {
    try {
      const equipment = await equipmentService.create(req.tenantId, req.body);
      
      // Log de criação de equipamento
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'CREATE_EQUIPMENT',
        entity_type: 'EQUIPMENT',
        entity_id: equipment.id,
        description: `Equipamento criado: ${equipment.type || ''} ${equipment.brand || ''} ${equipment.model || ''}`.trim(),
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar criação de equipamento:', err.message));
      
      res.status(201).json({ success: true, data: equipment });
    }
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
    try {
      const equipment = await equipmentService.update(req.tenantId, req.params.id, req.body);
      
      // Log de atualização de equipamento
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'UPDATE_EQUIPMENT',
        entity_type: 'EQUIPMENT',
        entity_id: req.params.id,
        description: `Equipamento atualizado: ${equipment.type || ''} ${equipment.brand || ''} ${equipment.model || ''}`.trim(),
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar atualização de equipamento:', err.message));
      
      res.json({ success: true, data: equipment });
    }
    catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try {
      // Busca o equipamento antes de deletar
      const equipment = await equipmentService.findById(req.tenantId, req.params.id);
      await equipmentService.delete(req.tenantId, req.params.id);
      
      // Log de exclusão de equipamento
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'DELETE_EQUIPMENT',
        entity_type: 'EQUIPMENT',
        entity_id: req.params.id,
        description: `Equipamento excluído: ${equipment.type || ''} ${equipment.brand || ''} ${equipment.model || ''}`.trim(),
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar exclusão de equipamento:', err.message));
      
      res.json({ success: true, data: { message: 'Equipamento removido' } });
    }
    catch (error) { next(error); }
  },
};

module.exports = equipmentController;
