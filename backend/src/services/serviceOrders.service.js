const serviceOrdersRepository = require('../repositories/serviceOrders.repository');
const clientsRepository = require('../repositories/clients.repository');
const equipmentRepository = require('../repositories/equipment.repository');
const techniciansRepository = require('../repositories/technicians.repository');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const serviceOrdersService = {
  async create(data) {
    // Validar existência das entidades vinculadas
    const client = await clientsRepository.findById(data.client_id);
    if (!client) throw new AppError('Cliente não encontrado', 404, 'NOT_FOUND');

    const equipment = await equipmentRepository.findById(data.equipment_id);
    if (!equipment) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');

    const technician = await techniciansRepository.findById(data.technician_id);
    if (!technician) throw new AppError('Técnico não encontrado', 404, 'NOT_FOUND');

    // Verificar se equipamento pertence ao cliente
    if (equipment.client_id !== data.client_id) {
      throw new AppError('Equipamento não pertence a este cliente', 400, 'VALIDATION_ERROR');
    }

    const { items, ...orderData } = data;
    return serviceOrdersRepository.create(orderData, items || []);
  },

  async findAll(params) {
    return serviceOrdersRepository.findAll(params);
  },

  async findById(id) {
    const order = await serviceOrdersRepository.findById(id);
    if (!order) throw new AppError('Ordem de Serviço não encontrada', 404, 'NOT_FOUND');
    return order;
  },

  async update(id, data) {
    const order = await serviceOrdersRepository.findById(id);
    if (!order) throw new AppError('Ordem de Serviço não encontrada', 404, 'NOT_FOUND');

    const { items, ...orderData } = data;
    return serviceOrdersRepository.update(id, orderData, items);
  },

  async updateStatus(id, status) {
    const order = await serviceOrdersRepository.findById(id);
    if (!order) throw new AppError('Ordem de Serviço não encontrada', 404, 'NOT_FOUND');

    return serviceOrdersRepository.updateStatus(id, status);
  },

  async delete(id) {
    const order = await serviceOrdersRepository.findById(id);
    if (!order) throw new AppError('Ordem de Serviço não encontrada', 404, 'NOT_FOUND');

    return serviceOrdersRepository.softDelete(id);
  },

  async findByEquipmentId(equipmentId) {
    const equipment = await equipmentRepository.findById(equipmentId);
    if (!equipment) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');

    return serviceOrdersRepository.findByEquipmentId(equipmentId);
  },
};

module.exports = serviceOrdersService;
