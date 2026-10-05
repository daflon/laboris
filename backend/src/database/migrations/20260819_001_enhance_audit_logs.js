/**
 * Migration: Melhorar tabela audit_logs para auditoria automática
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('audit_logs', (table) => {
    // Campos adicionais para auditoria mais completa
    table.string('ip_address', 45).nullable(); // IPv4 ou IPv6
    table.string('user_agent', 255).nullable();
    table.text('request_body').nullable(); // JSON sanitizado
    table.integer('response_status').nullable();
    table.integer('duration_ms').nullable();
    
    // Índices para consultas frequentes
    table.index('action');
    table.index('created_at');
    table.index(['tenant_id', 'created_at']);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropColumn('ip_address');
    table.dropColumn('user_agent');
    table.dropColumn('request_body');
    table.dropColumn('response_status');
    table.dropColumn('duration_ms');
    
    table.dropIndex('action');
    table.dropIndex('created_at');
    table.dropIndex(['tenant_id', 'created_at']);
  });
};
