const { Router } = require('express');
const db = require('../database/connection');

const router = Router();

router.get('/stats', async (req, res, next) => {
  try {
    // Contadores por status
    const statusCounts = await db('service_orders')
      .whereNull('deleted_at')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const statusMap = {};
    statusCounts.forEach((row) => {
      statusMap[row.status] = parseInt(row.count);
    });

    // Faturamento do mês (OS concluídas/entregues do mês atual)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const revenueResult = await db('service_order_items')
      .join('service_orders', 'service_orders.id', 'service_order_items.service_order_id')
      .whereNull('service_orders.deleted_at')
      .whereIn('service_orders.status', ['concluida', 'entregue'])
      .where('service_orders.entry_date', '>=', firstDay)
      .where('service_orders.entry_date', '<=', lastDay)
      .select(db.raw('SUM(service_order_items.quantity * service_order_items.unit_price) as total'))
      .first();

    // Total de OS no mês
    const monthOrders = await db('service_orders')
      .whereNull('deleted_at')
      .where('entry_date', '>=', firstDay)
      .where('entry_date', '<=', lastDay)
      .count('* as count')
      .first();

    // Últimas 5 OS criadas
    const recentOrders = await db('service_orders')
      .whereNull('service_orders.deleted_at')
      .leftJoin('clients', 'clients.id', 'service_orders.client_id')
      .leftJoin('equipment', 'equipment.id', 'service_orders.equipment_id')
      .select(
        'service_orders.id',
        'service_orders.order_number',
        'service_orders.status',
        'service_orders.entry_date',
        'clients.name as client_name',
        'equipment.type as equipment_type',
        'equipment.brand as equipment_brand'
      )
      .orderBy('service_orders.created_at', 'desc')
      .limit(5);

    // Total de clientes
    const totalClients = await db('clients').whereNull('deleted_at').count('* as count').first();

    // OS concluídas por técnico (ranking)
    const techRanking = await db('service_orders')
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
        revenue_month: parseFloat(revenueResult.total) || 0,
        orders_month: parseInt(monthOrders.count),
        recent_orders: recentOrders,
        total_clients: parseInt(totalClients.count),
        tech_ranking: techRanking.map((t) => ({ name: t.technician_name, count: parseInt(t.count) })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
