/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('equipment', (table) => {
    table.string('id', 36).primary();
    table.string('client_id', 36).notNullable().references('id').inTable('clients');
    table.string('type', 100).notNullable();
    table.string('brand', 100).notNullable();
    table.string('model', 100).notNullable();
    table.string('serial_number', 100);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('equipment');
};
