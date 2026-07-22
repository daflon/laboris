/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('audit_logs', (table) => {
      table.string('id', 36).primary();
      table.string('action', 50).notNullable(); // delete_os, delete_client, delete_equipment, delete_technician, access_settings
      table.string('entity_type', 50); // service_order, client, equipment, technician
      table.string('entity_id', 36);
      table.text('description');
      table.string('performed_by', 100); // quem digitou o PIN (futuro: nome do user)
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .table('company_settings', (table) => {
      table.string('admin_pin', 10);
    });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('audit_logs')
    .table('company_settings', (table) => {
      table.dropColumn('admin_pin');
    });
};
