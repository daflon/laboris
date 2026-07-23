const db = require('../database/connection');

const TABLE = 'service_orders';
const ITEMS_TABLE = 'service_order_items';

const serviceOrdersRepository = {
  async getNextOrderNumber(tenantId) {
    const result = await db(TABLE).where({ tenant_id: tenantId }).max('order_number as max').first();
    return (result.max || 0) + 1;
  },

  async create(tenantId, data, items = []) {
    const orderNumber = await this.getNextOrderNumber(tenantId);

    const [order] = await db(TABLE)
      .insert({
        tenant_id: tenantId,
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
      })
      .returning('*');

    if (items.length > 0) {
      const itemRecords = items.map((item) => ({
        service_order_id: order.id,
        quantity: item.quantity,
        description: item.description,
        unit_price: item.unit_price,
      }));
      await db(ITEMS_TABLE).insert(itemRecords);
    }

    return this.findById(tenantId, order.id);
  },

  async findAll(tenantId, { search, status, limit, offset }) {
    const query = db(TABLE)
      .where(`${TABLE}.tenant_id`, tenantId)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`)
      .leftJoin('equipment', 'equipment.id', `${TABLE}.equipment_id`)
      .leftJoin('technicians', 'technicians.id', `${TABLE}.technician_id`);

    if (status && status !== 'all') query.where(`${TABLE}.status`, status);

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where(function () {
        this.whereRaw(`CAST(${TABLE}.order_number AS TEXT) LIKE ?`, [`%${search}%`])
          .orWhereRaw('LOWER(clients.name) LIKE ?', [term]);
      });
    }

    const countQuery = db(TABLE)
      .where(`${TABLE}.tenant_id`, tenantId)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`);
    if (status && status !== 'all') countQuery.where(`${TABLE}.status`, status);
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

  async findById(tenantId, id) {
    const order = await db(TABLE)
      .where(`${TABLE}.id`, id)
      .where(`${TABLE}.tenant_id`, tenantId)
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
    const items = await db(ITEMS_TABLE).where({ service_order_id: id });
    return { ...order, items };
  },

  async update(tenantId, id, data, items) {
    const updateData = { updated_at: new Date().toISOString() };
    const fields = ['client_id', 'equipment_id', 'technician_id', 'status', 'reported_defect', 'diagnosis', 'notes', 'payment_method', 'warranty_days', 'entry_date', 'completion_date'];
    fields.forEach((f) => { if (data[f] !== undefined) updateData[f] = data[f] || null; });

    await db(TABLE).where({ id, tenant_id: tenantId }).whereNull('deleted_at').update(updateData);

    if (items !== undefined) {
      await db(ITEMS_TABLE).where({ service_order_id: id }).del();
      if (items.length > 0) {
        const itemRecords = items.map((item) => ({
          service_order_id: id,
          quantity: item.quantity,
          description: item.description,
          unit_price: item.unit_price,
        }));
        await db(ITEMS_TABLE).insert(itemRecords);
      }
    }

    return this.findById(tenantId, id);
  },

  async updateStatus(tenantId, id, status) {
    const updateData = { status, updated_at: new Date().toISOString() };
    if (status === 'concluida') updateData.completion_date = new Date().toISOString().split('T')[0];

    await db(TABLE).where({ id, tenant_id: tenantId }).whereNull('deleted_at').update(updateData);
    return this.findById(tenantId, id);
  },

  async softDelete(tenantId, id) {
    await db(TABLE).where({ id, tenant_id: tenantId }).whereNull('deleted_at').update({ deleted_at: new Date().toISOString() });
  },

  async findByEquipmentId(tenantId, equipmentId) {
    return db(TABLE)
      .where({ equipment_id: equipmentId, [`${TABLE}.tenant_id`]: tenantId })
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('technicians', 'technicians.id', `${TABLE}.technician_id`)
      .select(`${TABLE}.*`, 'technicians.name as technician_name')
      .orderBy('entry_date', 'desc');
  },
};

module.exports = serviceOrdersRepository;
