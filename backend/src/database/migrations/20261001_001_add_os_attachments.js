/**
 * Migration: Criar tabela de anexos/fotos para OS
 * - Armazena fotos em Base64 diretamente no banco
 * - Limite sugerido: 5 fotos por OS, max 2MB cada
 */

exports.up = async function(knex) {
  await knex.schema.createTable('os_attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('service_order_id').notNullable()
      .references('id').inTable('service_orders').onDelete('CASCADE');
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.text('image_data').notNullable(); // Base64 da imagem
    table.string('filename', 255).nullable();
    table.string('caption', 500).nullable(); // Legenda opcional
    table.string('mime_type', 100).defaultTo('image/jpeg');
    table.integer('size_bytes').nullable(); // Tamanho original em bytes
    table.uuid('uploaded_by').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices para performance
    table.index('service_order_id');
    table.index('tenant_id');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('os_attachments');
};
