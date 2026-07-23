const { Router } = require('express');
const db = require('../database/connection');

const router = Router();

router.get('/stats', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const statusCounts = await db('service_orders')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const statusMap = {};
    statusCounts.forEach((row) => { statusMap[row.status] = parseInt(row.count); });

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthOrders = await db('service_orders')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .where('entry_date', '>=', firstDay)
      .where('entry_date', '<=', lastDay)
      .count('* as count')
      .first();

    const recentOrders = await db('service_orders')
      .where('service_orders.tenant_id', tenantId)
      .whereNull('service_orders.deleted_at')
      .leftJoin('clients', 'clients.id', 'service_orders.client_id')
      .leftJoin('equipment', 'equipment.id', 'service_orders.equipment_id')
      .select('service_orders.id', 'service_orders.order_number', 'service_orders.status', 'service_orders.entry_date', 'clients.name as client_name', 'equipment.type as equipment_type', 'equipment.brand as equipment_brand')
      .orderBy('service_orders.created_at', 'desc')
      .limit(5);

    const totalClients = await db('clients').where({ tenant_id: tenantId }).whereNull('deleted_at').count('* as count').first();

    const techRanking = await db('service_orders')
      .where('service_orders.tenant_id', tenantId)
      .whereNull('service_orders.deleted_at')
      .whereIn('service_orders.status', ['concluida', 'entregue'])
      .leftJoin('technicians', 'technicians.id', 'service_orders.technician_id')
      .select('technicians.name as technician_name')
      .count('* as count')
      .groupBy('technicians.name')
      .orderBy('count', 'desc');

    res.json({
      success: true,
      data: {
        statuses: statusMap,
        orders_month: parseInt(monthOrders.count),
        recent_orders: recentOrders,
        total_clients: parseInt(totalClients.count),
        tech_ranking: techRanking.map((t) => ({ name: t.technician_name, count: parseInt(t.count) })),
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
