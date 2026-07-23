const { Router } = require('express');
const db = require('../database/connection');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: { clients: [], equipment: [], orders: [] } });

    const term = `%${q.toLowerCase()}%`;

    const clients = await db('clients')
      .where({ tenant_id: tenantId }).whereNull('deleted_at')
      .where(function () {
        this.whereRaw('LOWER(name) LIKE ?', [term])
          .orWhere('document', 'like', `%${q.replace(/\D/g, '')}%`)
          .orWhere('phone', 'like', `%${q.replace(/\D/g, '')}%`);
      })
      .select('id', 'name', 'document', 'phone').limit(5);

    const equipment = await db('equipment')
      .where('equipment.tenant_id', tenantId).whereNull('equipment.deleted_at')
      .leftJoin('clients', 'clients.id', 'equipment.client_id')
      .where(function () {
        this.whereRaw('LOWER(equipment.type) LIKE ?', [term])
          .orWhereRaw('LOWER(equipment.brand) LIKE ?', [term])
          .orWhereRaw('LOWER(equipment.model) LIKE ?', [term])
          .orWhereRaw('LOWER(clients.name) LIKE ?', [term]);
      })
      .select('equipment.id', 'equipment.type', 'equipment.brand', 'equipment.model', 'clients.name as client_name').limit(5);

    const orders = await db('service_orders')
      .where('service_orders.tenant_id', tenantId).whereNull('service_orders.deleted_at')
      .leftJoin('clients', 'clients.id', 'service_orders.client_id')
      .leftJoin('equipment', 'equipment.id', 'service_orders.equipment_id')
      .where(function () {
        this.whereRaw("CAST(service_orders.order_number AS TEXT) LIKE ?", [`%${q}%`])
          .orWhereRaw('LOWER(clients.name) LIKE ?', [term]);
      })
      .select('service_orders.id', 'service_orders.order_number', 'service_orders.status', 'clients.name as client_name', 'equipment.type as equipment_type', 'equipment.brand as equipment_brand')
      .orderBy('service_orders.order_number', 'desc').limit(5);

    res.json({ success: true, data: { clients, equipment, orders } });
  } catch (error) { next(error); }
});

module.exports = router;
