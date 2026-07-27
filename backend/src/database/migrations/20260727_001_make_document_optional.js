/**
 * Migration: Torna o campo document (CPF/CNPJ) opcional nos clientes
 * e remove a constraint UNIQUE para permitir clientes sem documento
 */
exports.up = async function (knex) {
  // 1. Remover a constraint unique (tenant_id, document)
  await knex.raw(`
    ALTER TABLE clients 
    DROP CONSTRAINT IF EXISTS clients_tenant_id_document_unique
  `);

  // 2. Tornar document nullable
  await knex.raw(`
    ALTER TABLE clients 
    ALTER COLUMN document DROP NOT NULL
  `);

  // 3. Criar nova constraint: unique apenas quando document não é vazio
  // Isso permite múltiplos NULLs/vazios, mas impede documentos duplicados reais
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_document_unique 
    ON clients (tenant_id, document) 
    WHERE document IS NOT NULL AND document != ''
  `);
};

exports.down = async function (knex) {
  // Reverter: remover index parcial
  await knex.raw(`
    DROP INDEX IF EXISTS clients_tenant_document_unique
  `);

  // Restaurar NOT NULL (pode falhar se houver NULLs)
  await knex.raw(`
    ALTER TABLE clients 
    ALTER COLUMN document SET NOT NULL
  `);

  // Restaurar constraint original
  await knex.raw(`
    ALTER TABLE clients 
    ADD CONSTRAINT clients_tenant_id_document_unique 
    UNIQUE (tenant_id, document)
  `);
};
