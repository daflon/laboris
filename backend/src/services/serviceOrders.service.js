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

    const result = await serviceOrdersRepository.updateStatus(tenantId, id, status);

    // Auto-gerar lançamento financeiro quando OS é concluída ou entregue
    if ((status === 'concluida' || status === 'entregue') && order.status !== 'concluida' && order.status !== 'entregue') {
      const db = require('../database/connection');
      const items = order.items || [];
      const total = items.reduce((s, item) => s + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);

      if (total > 0) {
        // Verificar se já existe lançamento pra essa OS
        const existing = await db('financial_entries').where({ tenant_id: tenantId, service_order_id: id }).first();
        if (!existing) {
          // Formata número da OS (com ou sem sufixo de lote)
          const orderDisplay = order.lote_sufixo 
            ? `${String(order.order_number).padStart(4, '0')}-${order.lote_sufixo}`
            : String(order.order_number).padStart(4, '0');
            
          await db('financial_entries').insert({
            tenant_id: tenantId,
            type: 'receita',
            description: `OS #${orderDisplay} - ${order.client_name || ''}`,
            amount: total,
            due_date: new Date().toISOString().split('T')[0],
            status: 'pendente',
            service_order_id: id,
          });
        }
      }
    }

    return result;
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

  // ========== LOTE METHODS ==========

  async addToLote(tenantId, orderId, data) {
    // Adiciona novo equipamento ao lote de uma OS existente
    const original = await serviceOrdersRepository.findById(tenantId, orderId);
    if (!original) throw new AppError('OS não encontrada', 404, 'NOT_FOUND');

    // Validar novo equipamento
    const equipment = await equipmentRepository.findById(tenantId, data.equipment_id);
    if (!equipment) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    if (equipment.client_id !== original.client_id) throw new AppError('Equipamento deve ser do mesmo cliente', 400, 'VALIDATION_ERROR');

    let loteNumero = original.lote_numero;

    // Se a OS original não é um lote ainda, converter
    if (!loteNumero) {
      await serviceOrdersRepository.convertToLote(tenantId, orderId);
      loteNumero = original.order_number;
    }

    // Criar nova OS no lote
    const newOrderData = {
      client_id: original.client_id,
      equipment_id: data.equipment_id,
      technician_id: data.technician_id || original.technician_id,
      status: 'aberta',
      reported_defect: data.reported_defect || '',
      diagnosis: '',
      notes: '',
      payment_method: original.payment_method || '',
      warranty_days: original.warranty_days || 90,
      entry_date: new Date().toISOString().split('T')[0],
    };

    return serviceOrdersRepository.createInLote(tenantId, newOrderData, data.items || [], loteNumero);
  },

  async duplicateToLote(tenantId, orderId, data) {
    // Duplica OS e adiciona ao mesmo lote (ou cria lote se não existir)
    const original = await serviceOrdersRepository.findById(tenantId, orderId);
    if (!original) throw new AppError('OS não encontrada', 404, 'NOT_FOUND');

    // Validar novo equipamento
    const equipment = await equipmentRepository.findById(tenantId, data.equipment_id);
    if (!equipment) throw new AppError('Equipamento não encontrado', 404, 'NOT_FOUND');
    if (equipment.client_id !== original.client_id) throw new AppError('Equipamento deve ser do mesmo cliente', 400, 'VALIDATION_ERROR');

    let loteNumero = original.lote_numero;

    // Se a OS original não é um lote ainda, converter
    if (!loteNumero) {
      await serviceOrdersRepository.convertToLote(tenantId, orderId);
      loteNumero = original.order_number;
    }

    // Criar nova OS no lote com dados da original
    const newOrderData = {
      client_id: original.client_id,
      equipment_id: data.equipment_id,
      technician_id: data.technician_id || original.technician_id,
      status: 'aberta',
      reported_defect: data.reported_defect || original.reported_defect || '',
      diagnosis: '',
      notes: '',
      payment_method: original.payment_method || '',
      warranty_days: original.warranty_days || 90,
      entry_date: new Date().toISOString().split('T')[0],
    };

    // Copiar itens se não foram fornecidos novos
    const items = data.items || (original.items || []).map(item => ({
      quantity: item.quantity,
      description: item.description,
      unit_price: item.unit_price
    }));

    return serviceOrdersRepository.createInLote(tenantId, newOrderData, items, loteNumero);
  },
};

module.exports = serviceOrdersService;
