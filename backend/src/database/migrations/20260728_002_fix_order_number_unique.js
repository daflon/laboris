/**
 * Migration: Remove constraint UNIQUE de order_number para permitir lotes
 * Com lotes, múltiplas OS podem ter o mesmo order_number (ex: 25-A, 25-B, 25-C)
 * A unicidade agora será: tenant_id + order_number + lote_sufixo
 */

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // Remove a constraint antiga
  await knex.schema.alterTable('service_orders', (table) => {
    table.dropUnique(['tenant_id', 'order_number']);
  });

  // Cria nova constraint composta que permite lotes
  // order_number + lote_sufixo juntos devem ser únicos por tenant
  await knex.raw(`
    CREATE UNIQUE INDEX idx_service_orders_unique_number 
    ON service_orders (tenant_id, order_number, COALESCE(lote_sufixo, ''))
    WHERE deleted_at IS NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_service_orders_unique_number');
  
  await knex.schema.alterTable('service_orders', (table) => {
    table.unique(['tenant_id', 'order_number']);
  });
};
