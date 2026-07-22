const crypto = require('crypto');
const db = require('../database/connection');

const TABLE = 'service_orders';
const ITEMS_TABLE = 'service_order_items';

const serviceOrdersRepository = {
  async getNextOrderNumber() {
    const result = await db(TABLE).max('order_number as max').first();
    return (result.max || 0) + 1;
  },

  async create(data, items = []) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const orderNumber = await this.getNextOrderNumber();

    const record = {
      id,
      order_number: orderNumber,
      client_id: data.client_id,
      equipment_id: data.equipment_id,
      technician_id: data.technician_id,
      status: data.status || 'aberta',
      reported_defect: data.reported_defect || null,
      diagnosis: data.diagnosis || null,
      notes: data.notes || null,
      payment_method: data.payment_method || null,
      warranty_days: data.warranty_days ?? 90,
      entry_date: data.entry_date || new Date().toISOString().split('T')[0],
      completion_date: data.completion_date || null,
      created_at: now,
      updated_at: now,
    };

    await db(TABLE).insert(record);

    // Inserir itens
    if (items.length > 0) {
      const itemRecords = items.map((item) => ({
        id: crypto.randomUUID(),
        service_order_id: id,
        quantity: item.quantity,
        description: item.description,
        unit_price: item.unit_price,
      }));
      await db(ITEMS_TABLE).insert(itemRecords);
    }

    return this.findById(id);
  },

  async findAll({ search, status, limit, offset }) {
    const query = db(TABLE)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`)
      .leftJoin('equipment', 'equipment.id', `${TABLE}.equipment_id`)
      .leftJoin('technicians', 'technicians.id', `${TABLE}.technician_id`);

    if (status && status !== 'all') {
      query.where(`${TABLE}.status`, status);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw(`CAST(${TABLE}.order_number AS TEXT) LIKE ?`, [`%${search}%`])
          .orWhereRaw('LOWER(clients.name) LIKE ?', [term]);
      });
    }

    const countQuery = db(TABLE)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`);

    if (status && status !== 'all') {
      countQuery.where(`${TABLE}.status`, status);
    }
    if (search) {
      const term = `%${search.toLowerCase()}%`;
      countQuery.where(function () {
        this.whereRaw(`CAST(${TABLE}.order_number AS TEXT) LIKE ?`, [`%${search}%`])
          .orWhereRaw('LOWER(clients.name) LIKE ?', [term]);
      });
    }

    const [{ count }] = await countQuery.count('* as count');

    const orders = await query
      .select(
        `${TABLE}.*`,
        'clients.name as client_name',
        'clients.phone as client_phone',
        'equipment.type as equipment_type',
        'equipment.brand as equipment_brand',
        'equipment.model as equipment_model',
        'technicians.name as technician_name'
      )
      .orderBy(`${TABLE}.order_number`, 'desc')
      .limit(limit)
      .offset(offset);

    return { orders, total: parseInt(count) };
  },

  async findById(id) {
    const order = await db(TABLE)
      .where(`${TABLE}.id`, id)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`)
      .leftJoin('equipment', 'equipment.id', `${TABLE}.equipment_id`)
      .leftJoin('technicians', 'technicians.id', `${TABLE}.technician_id`)
      .select(
        `${TABLE}.*`,
        'clients.name as client_name',
        'clients.phone as client_phone',
        'clients.document as client_document',
        'clients.email as client_email',
        'equipment.type as equipment_type',
        'equipment.brand as equipment_brand',
        'equipment.model as equipment_model',
        'equipment.serial_number as equipment_serial_number',
        'technicians.name as technician_name'
      )
      .first();

    if (!order) return null;

    const items = await db(ITEMS_TABLE)
      .where({ service_order_id: id });

    return { ...order, items };
  },

  async update(id, data, items) {
    const now = new Date().toISOString();

    const updateData = {
      updated_at: now,
    };

    const fields = [
      'client_id', 'equipment_id', 'technician_id', 'status',
      'reported_defect', 'diagnosis', 'notes', 'payment_method',
      'warranty_days', 'entry_date', 'completion_date'
    ];

    fields.forEach((field) => {
      if (data[field] !== undefined) {
        updateData[field] = data[field] || null;
      }
    });

    await db(TABLE).where({ id }).whereNull('deleted_at').update(updateData);

    // Atualizar itens: remove todos e reinsere
    if (items !== undefined) {
      await db(ITEMS_TABLE).where({ service_order_id: id }).del();
      if (items.length > 0) {
        const itemRecords = items.map((item) => ({
          id: item.id || crypto.randomUUID(),
          service_order_id: id,
          quantity: item.quantity,
          description: item.description,
          unit_price: item.unit_price,
        }));
        await db(ITEMS_TABLE).insert(itemRecords);
      }
    }

    return this.findById(id);
  },

  async updateStatus(id, status) {
    const now = new Date().toISOString();
    const updateData = { status, updated_at: now };

    // Se concluída, marca data de conclusão
    if (status === 'concluida') {
      updateData.completion_date = now.split('T')[0];
    }

    await db(TABLE).where({ id }).whereNull('deleted_at').update(updateData);
    return this.findById(id);
  },

  async softDelete(id) {
    const now = new Date().toISOString();
    await db(TABLE).where({ id }).whereNull('deleted_at').update({ deleted_at: now });
  },

  async findByEquipmentId(equipmentId) {
    const orders = await db(TABLE)
      .where({ equipment_id: equipmentId })
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('technicians', 'technicians.id', `${TABLE}.technician_id`)
      .select(
        `${TABLE}.*`,
        'technicians.name as technician_name'
      )
      .orderBy('entry_date', 'desc');

    return orders;
  },
};

module.exports = serviceOrdersRepository;
