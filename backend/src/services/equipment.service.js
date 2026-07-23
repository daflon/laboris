const equipmentRepository = require('../repositories/equipment.repository');
const clientsRepository = require('../repositories/clients.repository');

class AppError extends Error {
  constructor(message, statusCode, code) { super(message); this.statusCode = statusCode; this.code = code; }
}

const equipmentService = {
  async create(tenantId, data) {
    const client = await clientsRepository.findById(tenantId, data.client_id);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    return equipmentRepository.create(tenantId, data);
  },
  async findAll(tenantId, params) { return equipmentRepository.findAll(tenantId, params); },
  async findById(tenantId, id) {
    const eq = await equipmentRepository.findById(tenantId, id);
    if (!eq) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    return eq;
  },
  async findByClientId(tenantId, clientId) {
    const client = await clientsRepository.findById(tenantId, clientId);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    return equipmentRepository.findByClientId(tenantId, clientId);
  },
  async update(tenantId, id, data) {
    const eq = await equipmentRepository.findById(tenantId, id);
    if (!eq) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    return equipmentRepository.update(tenantId, id, data);
  },
  async delete(tenantId, id) {
    const eq = await equipmentRepository.findById(tenantId, id);
    if (!eq) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    return equipmentRepository.softDelete(tenantId, id);
  },
};

module.exports = equipmentService;
