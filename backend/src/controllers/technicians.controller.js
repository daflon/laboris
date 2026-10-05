const techniciansService = require('../services/technicians.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const db = require('../database/connection');

const techniciansController = {
  async create(req, res, next) {
    try {
      const technician = await techniciansService.create(req.tenantId, req.body);
      
      // Log de criação de técnico
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'CREATE_TECHNICIAN',
        entity_type: 'TECHNICIAN',
        entity_id: technician.id,
        description: `Técnico criado: ${technician.name}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar criação de técnico:', err.message));
      
      res.status(201).json({ success: true, data: technician });
    }
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
    try {
      const technician = await techniciansService.update(req.tenantId, req.params.id, req.body);
      
      // Log de atualização de técnico
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'UPDATE_TECHNICIAN',
        entity_type: 'TECHNICIAN',
        entity_id: req.params.id,
        description: `Técnico atualizado: ${technician.name}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar atualização de técnico:', err.message));
      
      res.json({ success: true, data: technician });
    }
    catch (error) { next(error); }
  },
  async toggleStatus(req, res, next) {
    try {
      const technician = await techniciansService.toggleStatus(req.tenantId, req.params.id);
      
      // Log de alteração de status do técnico
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'TOGGLE_TECHNICIAN_STATUS',
        entity_type: 'TECHNICIAN',
        entity_id: req.params.id,
        description: `Técnico ${technician.name} - Status alterado para: ${technician.active ? 'Ativo' : 'Inativo'}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar alteração de status do técnico:', err.message));
      
      res.json({ success: true, data: technician });
    }
    catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try {
      // Busca o técnico antes de deletar
      const technician = await techniciansService.findById(req.tenantId, req.params.id);
      await techniciansService.delete(req.tenantId, req.params.id);
      
      // Log de exclusão de técnico
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'DELETE_TECHNICIAN',
        entity_type: 'TECHNICIAN',
        entity_id: req.params.id,
        description: `Técnico excluído: ${technician.name}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar exclusão de técnico:', err.message));
      
      res.json({ success: true, data: { message: 'Técnico removido' } });
    }
    catch (error) { next(error); }
  },
};

module.exports = techniciansController;
