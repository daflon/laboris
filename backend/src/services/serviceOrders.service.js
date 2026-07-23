const serviceOrdersRepository = require('../repositories/serviceOrders.repository');
const clientsRepository = require('../repositories/clients.repository');
const equipmentRepository = require('../repositories/equipment.repository');
const techniciansRepository = require('../repositories/technicians.repository');

class AppError extends Error {
  constructor(message, statusCode, code) { super(message); this.statusCode = statusCode; this.code = code; }
}

const serviceOrdersService = {
  async create(tenantId, data) {
    const client = await clientsRepository.findById(tenantId, data.client_id);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');
    const equipment = await equipmentRepository.findById(tenantId, data.equipment_id);
    if (!equipment) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    const technician = await techniciansRepository.findById(tenantId, data.technician_id);
    if (!technician) throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');
    if (equipment.client_id !== data.client_id) throw new AppError('Equipamento não pertence a este cliente', 400, 'VALIDATION_ERROR');

    const { items, ...orderData } = data;
    return serviceOrdersRepository.create(tenantId, orderData, items || []);
  },

  async findAll(tenantId, params) { return serviceOrdersRepository.findAll(tenantId, params); },

  async findById(tenantId, id) {
    const order = await serviceOrdersRepository.findById(tenantId, id);
    if (!order) throw new AppError('OS não encontrada', 404, 'NOT_FOUND');
    return order;
  },

  async update(tenantId, id, data) {
    const order = await serviceOrdersRepository.findById(tenantId, id);
    if (!order) throw new AppError('OS não encontrada', 404, 'NOT_FOUND');
    const { items, ...orderData } = data;
    return serviceOrdersRepository.update(tenantId, id, orderData, items);
  },

  async updateStatus(tenantId, id, status) {
    const order = await serviceOrdersRepository.findById(tenantId, id);
    if (!order) throw new AppError('OS não encontrada', 404, 'NOT_FOUND');
    return serviceOrdersRepository.updateStatus(tenantId, id, status);
  },

  async delete(tenantId, id) {
    const order = await serviceOrdersRepository.findById(tenantId, id);
    if (!order) throw new AppError('OS não encontrada', 404, 'NOT_FOUND');
    return serviceOrdersRepository.softDelete(tenantId, id);
  },

  async findByEquipmentId(tenantId, equipmentId) {
    const eq = await equipmentRepository.findById(tenantId, equipmentId);
    if (!eq) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    return serviceOrdersRepository.findByEquipmentId(tenantId, equipmentId);
  },
};

module.exports = serviceOrdersService;
