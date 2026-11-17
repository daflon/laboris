/**
 * Migration: Criar tabela de histórico de status das OS
 * - Registra cada mudança de status com data/hora
 * - Usado para timeline visual no frontend
 */

exports.up = async function(knex) {
  await knex.schema.createTable('os_status_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('service_order_id').notNullable()
      .references('id').inTable('service_orders').onDelete('CASCADE');
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.string('from_status', 50).nullable(); // null quando é criação
    table.string('to_status', 50).notNullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now());
    
    // Índices para performance
    table.index('service_order_id');
    table.index('tenant_id');
    table.index('changed_at');
  });

  // Inserir histórico inicial para OS existentes (status atual como primeiro registro)
  const existingOrders = await knex('service_orders')
    .whereNull('deleted_at')
    .select('id', 'tenant_id', 'status', 'created_at');

  if (existingOrders.length > 0) {
    const historyRecords = existingOrders.map(order => ({
      service_order_id: order.id,
      tenant_id: order.tenant_id,
      from_status: null,
      to_status: order.status,
      changed_at: order.created_at,
    }));

    // Inserir em lotes de 100 para evitar problemas
    const chunkSize = 100;
    for (let i = 0; i < historyRecords.length; i += chunkSize) {
      const chunk = historyRecords.slice(i, i + chunkSize);
      await knex('os_status_history').insert(chunk);
    }
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('os_status_history');
};
