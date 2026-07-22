/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('service_orders', (table) => {
      table.string('id', 36).primary();
      table.integer('order_number').notNullable().unique();
      table.string('client_id', 36).notNullable().references('id').inTable('clients');
      table.string('equipment_id', 36).notNullable().references('id').inTable('equipment');
      table.string('technician_id', 36).notNullable().references('id').inTable('technicians');
      table.string('status', 30).notNullable().defaultTo('aberta');
      table.text('reported_defect');
      table.text('diagnosis');
      table.text('notes');
      table.string('payment_method', 50);
      table.integer('warranty_days').defaultTo(90);
      table.date('entry_date');
      table.date('completion_date');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at');
    })
    .createTable('service_order_items', (table) => {
      table.string('id', 36).primary();
      table.string('service_order_id', 36).notNullable().references('id').inTable('service_orders').onDelete('CASCADE');
      table.decimal('quantity', 10, 2).notNullable().defaultTo(1);
      table.text('description').notNullable();
      table.decimal('unit_price', 10, 2).notNullable().defaultTo(0);
    });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('service_order_items')
    .dropTableIfExists('service_orders');
};
