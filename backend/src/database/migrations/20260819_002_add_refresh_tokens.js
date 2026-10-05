/**
 * Migration: Criar tabela de refresh tokens
 */

exports.up = async function(knex) {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('token_hash', 64).notNullable().unique(); // SHA256 do token
    table.string('device_info', 255).nullable(); // User-Agent resumido
    table.string('ip_address', 45).nullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('revoked_at').nullable(); // Se foi revogado manualmente
    
    // Índices
    table.index('user_id');
    table.index('token_hash');
    table.index('expires_at');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
};
