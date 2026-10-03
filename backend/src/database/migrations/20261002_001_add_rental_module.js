/**
 * Migration: Módulo de Aluguéis de Equipamentos
 * - Tabela de patrimônio (equipamentos próprios da empresa)
 * - Tabela de contratos de aluguel
 */

exports.up = async function(knex) {
  // Tabela de Patrimônio (equipamentos próprios da empresa para aluguel)
  await knex.schema.createTable('patrimonio', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    
    table.string('codigo', 50).notNullable(); // Código interno do patrimônio
    table.string('nome', 255).notNullable(); // Nome/descrição do equipamento
    table.string('categoria', 100).nullable(); // Ex: Gerador, Compressor, Ferramenta
    table.string('marca', 100).nullable();
    table.string('modelo', 100).nullable();
    table.string('numero_serie', 100).nullable();
    
    table.decimal('valor_compra', 10, 2).nullable(); // Valor de aquisição
    table.decimal('valor_diaria', 10, 2).nullable(); // Valor por dia
    table.decimal('valor_semanal', 10, 2).nullable(); // Valor por semana
    table.decimal('valor_mensal', 10, 2).nullable(); // Valor por mês
    
    table.enum('status', ['disponivel', 'alugado', 'manutencao', 'inativo']).defaultTo('disponivel');
    table.text('observacoes').nullable();
    table.text('foto_url').nullable(); // Foto do equipamento (Base64 ou URL)
    
    table.timestamp('data_aquisicao').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    // Índices
    table.index('tenant_id');
    table.index('status');
    table.unique(['tenant_id', 'codigo']); // Código único por tenant
  });

  // Tabela de Contratos de Aluguel
  await knex.schema.createTable('alugueis', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patrimonio_id').notNullable()
      .references('id').inTable('patrimonio').onDelete('RESTRICT');
    table.uuid('client_id').notNullable()
      .references('id').inTable('clients').onDelete('RESTRICT');
    
    table.integer('numero').notNullable(); // Número sequencial do aluguel por tenant
    
    table.timestamp('data_inicio').notNullable();
    table.timestamp('data_prevista_devolucao').notNullable();
    table.timestamp('data_devolucao').nullable(); // Preenchido quando devolver
    
    table.enum('tipo_cobranca', ['diaria', 'semanal', 'mensal', 'fixo']).defaultTo('diaria');
    table.decimal('valor_acordado', 10, 2).notNullable(); // Valor total acordado
    table.decimal('valor_final', 10, 2).nullable(); // Valor final após devolução (pode ter ajustes)
    
    table.enum('status', ['ativo', 'devolvido', 'atrasado', 'cancelado']).defaultTo('ativo');
    table.text('condicao_saida').nullable(); // Condição do equipamento na saída
    table.text('condicao_devolucao').nullable(); // Condição na devolução
    table.boolean('equipamento_danificado').defaultTo(false);
    table.uuid('os_manutencao_id').nullable() // OS gerada se equipamento voltar danificado
      .references('id').inTable('service_orders').onDelete('SET NULL');
    
    table.text('observacoes').nullable();
    table.uuid('created_by').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('tenant_id');
    table.index('patrimonio_id');
    table.index('client_id');
    table.index('status');
    table.index('data_prevista_devolucao');
    table.unique(['tenant_id', 'numero']); // Número único por tenant
  });

  // Tabela de Pagamentos de Aluguel
  await knex.schema.createTable('aluguel_pagamentos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('aluguel_id').notNullable()
      .references('id').inTable('alugueis').onDelete('CASCADE');
    
    table.decimal('valor', 10, 2).notNullable();
    table.timestamp('data_pagamento').notNullable();
    table.enum('forma_pagamento', ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro']).defaultTo('dinheiro');
    table.text('observacoes').nullable();
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('tenant_id');
    table.index('aluguel_id');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('aluguel_pagamentos');
  await knex.schema.dropTableIfExists('alugueis');
  await knex.schema.dropTableIfExists('patrimonio');
};
