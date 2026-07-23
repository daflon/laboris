const techniciansRepository = require('../repositories/technicians.repository');

class AppError extends Error {
  constructor(message, statusCode, code) { super(message); this.statusCode = statusCode; this.code = code; }
}

const techniciansService = {
  async create(tenantId, data) { return techniciansRepository.create(tenantId, data); },
  async findAll(tenantId, params) { return techniciansRepository.findAll(tenantId, params); },
  async findById(tenantId, id) {
    const t = await techniciansRepository.findById(tenantId, id);
    if (!t) throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    return t;
  },
  async update(tenantId, id, data) {
    const t = await techniciansRepository.findById(tenantId, id);
    if (!t) throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    return techniciansRepository.update(tenantId, id, data);
  },
  async toggleStatus(tenantId, id) {
    const t = await techniciansRepository.findById(tenantId, id);
    if (!t) throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    return techniciansRepository.toggleStatus(tenantId, id);
  },
  async delete(tenantId, id) {
    const t = await techniciansRepository.findById(tenantId, id);
    if (!t) throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    return techniciansRepository.softDelete(tenantId, id);
  },
};

module.exports = techniciansService;
