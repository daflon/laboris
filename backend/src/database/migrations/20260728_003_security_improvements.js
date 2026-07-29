/**
 * Migration: Security Improvements
 * - pin_attempts: Rate limiting para tentativas de PIN
 * - impersonate_logs: Auditoria de sessões de impersonate
 */

exports.up = async function(knex) {
  // Tabela de tentativas de PIN (rate limiting)
  await knex.schema.createTable('pin_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('ip_address', 45).notNullable();
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    table.boolean('success').defaultTo(false);
    
    // Índice para consulta rápida
    table.index(['tenant_id', 'ip_address', 'attempted_at']);
  });

  // Tabela de logs de impersonate
  await knex.schema.createTable('impersonate_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('admin_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('ended_at').nullable();
    table.string('ip_address', 45).nullable();
    table.text('actions_summary').nullable();
    
    // Índices
    table.index(['admin_id']);
    table.index(['tenant_id']);
    table.index(['started_at']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('impersonate_logs');
  await knex.schema.dropTableIfExists('pin_attempts');
};
