const equipmentRepository = require('../repositories/equipment.repository');
const clientsRepository = require('../repositories/clients.repository');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const equipmentService = {
  async create(data) {
    // Verifica se o cliente existe
    const client = await clientsRepository.findById(data.client_id);
    if (!client) {
      throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    }
    return equipmentRepository.create(data);
  },

  async findAll(params) {
    return equipmentRepository.findAll(params);
  },

  async findById(id) {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) {
      throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    }
    return equipment;
  },

  async findByClientId(clientId) {
    // Verifica se o cliente existe
    const client = await clientsRepository.findById(clientId);
    if (!client) {
      throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    }
    return equipmentRepository.findByClientId(clientId);
  },

  async update(id, data) {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) {
      throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    }
    return equipmentRepository.update(id, data);
  },

  async delete(id) {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) {
      throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    }
    return equipmentRepository.softDelete(id);
  },
};

module.exports = equipmentService;
