const techniciansRepository = require('../repositories/technicians.repository');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const techniciansService = {
  async create(data) {
    return techniciansRepository.create(data);
  },

  async findAll(params) {
    return techniciansRepository.findAll(params);
  },

  async findById(id) {
    const technician = await techniciansRepository.findById(id);
    if (!technician) {
      throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    }
    return technician;
  },

  async update(id, data) {
    const technician = await techniciansRepository.findById(id);
    if (!technician) {
      throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    }
    return techniciansRepository.update(id, data);
  },

  async toggleStatus(id) {
    const technician = await techniciansRepository.findById(id);
    if (!technician) {
      throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    }
    return techniciansRepository.toggleStatus(id);
  },

  async delete(id) {
    const technician = await techniciansRepository.findById(id);
    if (!technician) {
      throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    }
    return techniciansRepository.softDelete(id);
  },
};

module.exports = techniciansService;
