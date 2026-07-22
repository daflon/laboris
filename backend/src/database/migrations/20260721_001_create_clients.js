/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('clients', (table) => {
    table.string('id', 36).primary();
    table.string('name', 200).notNullable();
    table.string('document', 18).notNullable().unique();
    table.string('phone', 20).notNullable();
    table.string('email', 200);
    table.string('address_street', 200);
    table.string('address_number', 20);
    table.string('address_complement', 100);
    table.string('address_neighborhood', 100);
    table.string('address_city', 100);
    table.string('address_state', 2);
    table.string('address_zip', 8);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('clients');
};
