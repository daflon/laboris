/**
 * Migration: Adiciona campos de lote às ordens de serviço
 * Permite agrupar múltiplas OS (múltiplos equipamentos) sob um mesmo número de atendimento
 * Exemplo: 025-A, 025-B, 025-C para um cliente que trouxe 3 máquinas
 */

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('service_orders', (table) => {
    // Número do lote (mesmo valor para OS agrupadas)
    // Se NULL, é uma OS avulsa (comportamento padrão)
    table.integer('lote_numero').nullable();
    
    // Sufixo do lote (A, B, C, D... até Z)
    // Se NULL, é uma OS avulsa
    table.string('lote_sufixo', 1).nullable();
    
    // Índice para buscar OS do mesmo lote rapidamente
    table.index(['tenant_id', 'lote_numero'], 'idx_service_orders_lote');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('service_orders', (table) => {
    table.dropIndex(['tenant_id', 'lote_numero'], 'idx_service_orders_lote');
    table.dropColumn('lote_sufixo');
    table.dropColumn('lote_numero');
  });
};
