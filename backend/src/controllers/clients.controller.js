const clientsService = require('../services/clients.service');
const equipmentService = require('../services/equipment.service');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const db = require('../database/connection');

const clientsController = {
  async create(req, res, next) {
    try {
      const client = await clientsService.create(req.tenantId, req.body);
      
      // Log de criação de cliente
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'CREATE_CLIENT',
        entity_type: 'CLIENT',
        entity_id: client.id,
        description: `Cliente criado: ${client.name}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar criação de cliente:', err.message));
      
      res.status(201).json({ success: true, data: client });
    } catch (error) { next(error); }
  },
  async findAll(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { search } = req.query;
      const { clients, total } = await clientsService.findAll(req.tenantId, { search, limit, offset });
      res.json({ success: true, data: clients, meta: buildPaginationMeta(page, limit, total) });
    } catch (error) { next(error); }
  },
  async findById(req, res, next) {
    try {
      const client = await clientsService.findById(req.tenantId, req.params.id);
      const equipment = await equipmentService.findByClientId(req.tenantId, req.params.id);
      res.json({ success: true, data: { ...client, equipment } });
    } catch (error) { next(error); }
  },
  async update(req, res, next) {
    try {
      const client = await clientsService.update(req.tenantId, req.params.id, req.body);
      
      // Log de atualização de cliente
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'UPDATE_CLIENT',
        entity_type: 'CLIENT',
        entity_id: req.params.id,
        description: `Cliente atualizado: ${client.name}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar atualização de cliente:', err.message));
      
      res.json({ success: true, data: client });
    } catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try {
      // Busca o cliente antes de deletar para ter o nome
      const client = await clientsService.findById(req.tenantId, req.params.id);
      await clientsService.delete(req.tenantId, req.params.id);
      
      // Log de exclusão de cliente
      await db('audit_logs').insert({
        tenant_id: req.tenantId,
        action: 'DELETE_CLIENT',
        entity_type: 'CLIENT',
        entity_id: req.params.id,
        description: `Cliente excluído: ${client.name}`,
        performed_by: req.user?.email || 'system',
      }).catch(err => console.error('Erro ao logar exclusão de cliente:', err.message));
      
      res.json({ success: true, data: { message: 'Cliente removido com sucesso' } });
    } catch (error) { next(error); }
  },
};

module.exports = clientsController;
