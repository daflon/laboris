/**
 * Migration: Adicionar aluguel_id na tabela financial_entries
 * Permite vincular lançamentos financeiros a aluguéis
 */

exports.up = async function(knex) {
  // Adicionar coluna aluguel_id
  await knex.schema.alterTable('financial_entries', (table) => {
    table.uuid('aluguel_id').nullable()
      .references('id').inTable('alugueis').onDelete('SET NULL');
    table.index('aluguel_id');
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('financial_entries', (table) => {
    table.dropColumn('aluguel_id');
  });
};
