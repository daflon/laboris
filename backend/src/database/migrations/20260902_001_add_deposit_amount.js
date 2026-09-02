/**
 * Migration: Adicionar campo de sinal/adiantamento nas OS
 * - deposit_amount: valor do sinal pago pelo cliente antes do serviço
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('service_orders', (table) => {
    table.decimal('deposit_amount', 10, 2).nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('service_orders', (table) => {
    table.dropColumn('deposit_amount');
  });
};
