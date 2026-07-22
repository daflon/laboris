/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('company_settings', (table) => {
    table.string('id', 36).primary();
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
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('company_settings');
};
