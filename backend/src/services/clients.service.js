const clientsRepository = require('../repositories/clients.repository');

class AppError extends Error {
  constructor(message, statusCode, code) { super(message); this.statusCode = statusCode; this.code = code; }
}

const clientsService = {
  async create(tenantId, data) {
    const existing = await clientsRepository.findByDocument(tenantId, data.document);
    if (existing) throw new AppError('Já existe um cliente com este documento', 409, 'CONFLICT');
    return clientsRepository.create(tenantId, data);
  },

  async findAll(tenantId, params) { return clientsRepository.findAll(tenantId, params); },

  async findById(tenantId, id) {
    const client = await clientsRepository.findById(tenantId, id);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    return client;
  },

  async update(tenantId, id, data) {
    const client = await clientsRepository.findById(tenantId, id);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    if (data.document && data.document !== client.document) {
      const existing = await clientsRepository.findByDocument(tenantId, data.document);
      if (existing) throw new AppError('Já existe um cliente com este documento', 409, 'CONFLICT');
    }
    return clientsRepository.update(tenantId, id, data);
  },

  async delete(tenantId, id) {
    const client = await clientsRepository.findById(tenantId, id);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    return clientsRepository.softDelete(tenantId, id);
  },
};

module.exports = clientsService;
