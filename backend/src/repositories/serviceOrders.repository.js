const db = require('../database/connection');

const TABLE = 'service_orders';
const ITEMS_TABLE = 'service_order_items';

const serviceOrdersRepository = {
  async getNextOrderNumber(tenantId) {
    const result = await db(TABLE).where({ tenant_id: tenantId }).max('order_number as max').first();
    return (result.max || 0) + 1;
  },

  async getNextLoteSufixo(tenantId, loteNumero) {
    // Busca o maior sufixo usado neste lote
    const result = await db(TABLE)
      .where({ tenant_id: tenantId, lote_numero: loteNumero })
      .whereNull('deleted_at')
      .max('lote_sufixo as max')
      .first();
    
    if (!result.max) return 'A';
    
    // Próxima letra (A -> B -> C ... Z)
    const nextCharCode = result.max.charCodeAt(0) + 1;
    if (nextCharCode > 90) return null; // Limite de 26 itens (A-Z)
    return String.fromCharCode(nextCharCode);
  },

  async findLoteByNumero(tenantId, loteNumero) {
    return db(TABLE)
      .where({ tenant_id: tenantId, lote_numero: loteNumero })
      .whereNull('deleted_at')
      .orderBy('lote_sufixo', 'asc');
  },

  async create(tenantId, data, items = []) {
    const orderNumber = await this.getNextOrderNumber(tenantId);

    const insertData = {
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
      lote_numero: data.lote_numero || null,
      lote_sufixo: data.lote_sufixo || null,
    };

    const [order] = await db(TABLE).insert(insertData).returning('*');

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

  async createInLote(tenantId, data, items = [], loteNumero = null) {
    // Se não passar loteNumero, cria um novo lote com o próximo order_number
    if (!loteNumero) {
      loteNumero = await this.getNextOrderNumber(tenantId);
    }

    const sufixo = await this.getNextLoteSufixo(tenantId, loteNumero);
    if (!sufixo) {
      throw new Error('Limite de 26 itens por lote atingido (A-Z)');
    }

    // Usa o número do lote como order_number
    const insertData = {
      tenant_id: tenantId,
      order_number: loteNumero,
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
      lote_numero: loteNumero,
      lote_sufixo: sufixo,
    };

    const [order] = await db(TABLE).insert(insertData).returning('*');

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

  async convertToLote(tenantId, orderId) {
    // Converte uma OS avulsa em lote (adiciona sufixo -A)
    const order = await this.findById(tenantId, orderId);
    if (!order) throw new Error('OS não encontrada');
    if (order.lote_numero) throw new Error('OS já pertence a um lote');

    await db(TABLE)
      .where({ id: orderId, tenant_id: tenantId })
      .update({
        lote_numero: order.order_number,
        lote_sufixo: 'A',
        updated_at: new Date().toISOString(),
      });

    return this.findById(tenantId, orderId);
  },

  async findAll(tenantId, { search, status, filter, limit, offset }) {
    const query = db(TABLE)
      .where(`${TABLE}.tenant_id`, tenantId)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('clients', 'clients.id', `${TABLE}.client_id`)
      .leftJoin('equipment', 'equipment.id', `${TABLE}.equipment_id`)
      .leftJoin('technicians', 'technicians.id', `${TABLE}.technician_id`);

    if (status && status !== 'all') query.where(`${TABLE}.status`, status);

    // Filtro especial: OS antigas (> 30 dias, não finalizadas)
    if (filter === 'old') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      query.whereNotIn(`${TABLE}.status`, ['entregue', 'cancelada']);
      query.where(`${TABLE}.entry_date`, '<', thirtyDaysAgo);
    }

    // Filtro especial: Equipamentos abandonados (> 180 dias, não finalizados)
    if (filter === 'abandoned') {
      const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      query.whereNotIn(`${TABLE}.status`, ['entregue', 'cancelada']);
      query.where(`${TABLE}.entry_date`, '<', oneEightyDaysAgo);
    }

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
    
    // Aplicar mesmos filtros especiais na contagem
    if (filter === 'old') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      countQuery.whereNotIn(`${TABLE}.status`, ['entregue', 'cancelada']);
      countQuery.where(`${TABLE}.entry_date`, '<', thirtyDaysAgo);
    }
    if (filter === 'abandoned') {
      const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      countQuery.whereNotIn(`${TABLE}.status`, ['entregue', 'cancelada']);
      countQuery.where(`${TABLE}.entry_date`, '<', oneEightyDaysAgo);
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
      .orderBy(`${TABLE}.lote_sufixo`, 'asc')
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
    
    // Se faz parte de um lote, buscar outras OS do mesmo lote
    let loteItems = [];
    if (order.lote_numero) {
      loteItems = await db(TABLE)
        .where({ [`${TABLE}.tenant_id`]: tenantId, [`${TABLE}.lote_numero`]: order.lote_numero })
        .whereNull(`${TABLE}.deleted_at`)
        .whereNot(`${TABLE}.id`, id)
        .leftJoin('equipment', 'equipment.id', `${TABLE}.equipment_id`)
        .select(
          `${TABLE}.id as id`,
          `${TABLE}.lote_sufixo as lote_sufixo`,
          `${TABLE}.status as status`,
          'equipment.type as equipment_type',
          'equipment.brand as equipment_brand',
          'equipment.model as equipment_model'
        )
        .orderBy(`${TABLE}.lote_sufixo`, 'asc');
    }
    
    return { ...order, items, lote_items: loteItems };
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
    
    // Auto-preencher completion_date quando status for concluida ou entregue
    if (status === 'concluida' || status === 'entregue') {
      // Verificar se já tem completion_date preenchido
      const current = await db(TABLE).where({ id, tenant_id: tenantId }).first();
      if (!current.completion_date) {
        updateData.completion_date = new Date().toISOString().split('T')[0];
      }
    }

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
