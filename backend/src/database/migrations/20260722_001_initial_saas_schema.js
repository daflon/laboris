/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // Enable UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Tenants (empresas/contas)
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.string('slug', 50).notNullable().unique();
    table.boolean('active').notNullable().defaultTo(true);
    table.jsonb('modules').defaultTo('["os"]');
    table.timestamps(true, true);
  });

  // Users (autenticação)
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('email', 200).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('role', 20).notNullable().defaultTo('tenant_user');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('last_login');
    table.timestamps(true, true);
  });

  // Clients
  await knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('document', 18).notNullable();
    table.string('phone', 20).notNullable();
    table.string('email', 200);
    table.string('address_street', 200);
    table.string('address_number', 20);
    table.string('address_complement', 100);
    table.string('address_neighborhood', 100);
    table.string('address_city', 100);
    table.string('address_state', 2);
    table.string('address_zip', 8);
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    table.unique(['tenant_id', 'document']);
  });

  // Technicians
  await knex.schema.createTable('technicians', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('phone', 20).notNullable();
    table.string('specialty', 200);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at');
  });

  // Equipment
  await knex.schema.createTable('equipment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.string('type', 100).notNullable();
    table.string('brand', 100).notNullable();
    table.string('model', 100).notNullable();
    table.string('serial_number', 100);
    table.text('notes');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    table.index('client_id');
    table.index('tenant_id');
  });

  // Service Orders
  await knex.schema.createTable('service_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.integer('order_number').notNullable();
    table.uuid('client_id').notNullable().references('id').inTable('clients');
    table.uuid('equipment_id').notNullable().references('id').inTable('equipment');
    table.uuid('technician_id').notNullable().references('id').inTable('technicians');
    table.string('status', 30).notNullable().defaultTo('aberta');
    table.text('reported_defect');
    table.text('diagnosis');
    table.text('notes');
    table.string('payment_method', 50);
    table.integer('warranty_days').defaultTo(90);
    table.date('entry_date');
    table.date('completion_date');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    table.unique(['tenant_id', 'order_number']);
    table.index('tenant_id');
  });

  // Service Order Items
  await knex.schema.createTable('service_order_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('service_order_id').notNullable().references('id').inTable('service_orders').onDelete('CASCADE');
    table.decimal('quantity', 10, 2).notNullable().defaultTo(1);
    table.text('description').notNullable();
    table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
  });

  // Company Settings (1 per tenant)
  await knex.schema.createTable('company_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().unique().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('document', 18);
    table.string('phone', 20);
    table.string('phone2', 20);
    table.string('email', 200);
    table.string('address_street', 200);
    table.string('address_number', 20);
    table.string('address_complement', 100);
    table.string('address_neighborhood', 100);
    table.string('address_city', 100);
    table.string('address_state', 2);
    table.string('address_zip', 8);
    table.text('logo_url');
    table.text('header_text');
    table.text('footer_text');
    table.integer('default_warranty_days').defaultTo(90);
    table.string('admin_pin', 10);
    table.timestamps(true, true);
  });

  // Audit Logs
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants');
    table.string('action', 50).notNullable();
    table.string('entity_type', 50);
    table.string('entity_id', 36);
    table.text('description');
    table.string('performed_by', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Financial Entries (faturamento)
  await knex.schema.createTable('financial_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('type', 20).notNullable(); // receita | despesa
    table.text('description').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.date('due_date');
    table.date('paid_date');
    table.string('status', 20).notNullable().defaultTo('pendente');
    table.uuid('service_order_id').references('id').inTable('service_orders');
    table.timestamps(true, true);
    table.index('tenant_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('financial_entries');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('company_settings');
  await knex.schema.dropTableIfExists('service_order_items');
  await knex.schema.dropTableIfExists('service_orders');
  await knex.schema.dropTableIfExists('equipment');
  await knex.schema.dropTableIfExists('technicians');
  await knex.schema.dropTableIfExists('clients');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
};
