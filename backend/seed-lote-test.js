/**
 * Seed de teste para sistema de lotes
 * Cria um cliente com 3 equipamentos e um lote de 3 OS
 * 
 * Uso: node seed-lote-test.js
 */

require('dotenv').config();
const db = require('./src/database/connection');

async function seedLoteTest() {
  console.log('🌱 Iniciando seed de teste de lotes...\n');

  try {
    // Buscar tenant master
    const masterTenant = await db('tenants').where({ slug: 'master' }).first();
    if (!masterTenant) {
      console.error('❌ Tenant "master" não encontrado. Execute o seed principal primeiro.');
      process.exit(1);
    }

    const tenantId = masterTenant.id;
    console.log(`📦 Usando tenant: ${masterTenant.name} (${tenantId})\n`);

    // Buscar um técnico existente
    const technician = await db('technicians').where({ tenant_id: tenantId }).whereNull('deleted_at').first();
    if (!technician) {
      console.error('❌ Nenhum técnico encontrado. Cadastre um técnico primeiro.');
      process.exit(1);
    }

    console.log(`👷 Técnico: ${technician.name}\n`);

    // Criar ou buscar cliente de teste
    let client = await db('clients')
      .where({ tenant_id: tenantId, document: '12345678000199' })
      .whereNull('deleted_at')
      .first();
    
    if (!client) {
      [client] = await db('clients').insert({
        tenant_id: tenantId,
        name: 'Construtora Lote & CIA',
        document: '12345678000199',
        phone: '11999887766',
        email: 'lote@construtora.com',
        address_city: 'São Paulo',
        address_state: 'SP',
      }).returning('*');
      console.log(`👤 Cliente criado: ${client.name}`);
    } else {
      console.log(`👤 Cliente existente: ${client.name}`);
    }

    // Criar ou buscar equipamentos para o cliente
    const equipments = [];
    const equipmentData = [
      { type: 'Furadeira', brand: 'Bosch', model: 'GSB 550 RE', serial_number: 'FUR001' },
      { type: 'Esmerilhadeira', brand: 'DeWalt', model: 'DWE4020', serial_number: 'ESM002' },
      { type: 'Serra Circular', brand: 'Makita', model: 'HS7010', serial_number: 'SER003' },
    ];

    for (const eq of equipmentData) {
      let equipment = await db('equipment')
        .where({ tenant_id: tenantId, client_id: client.id, serial_number: eq.serial_number })
        .whereNull('deleted_at')
        .first();
      
      if (!equipment) {
        [equipment] = await db('equipment').insert({
          tenant_id: tenantId,
          client_id: client.id,
          ...eq,
        }).returning('*');
        console.log(`🔧 Equipamento criado: ${eq.type} ${eq.brand} ${eq.model}`);
      } else {
        console.log(`🔧 Equipamento existente: ${eq.type} ${eq.brand} ${eq.model}`);
      }
      equipments.push(equipment);
    }

    // Obter próximo order_number
    const result = await db('service_orders').where({ tenant_id: tenantId }).max('order_number as max').first();
    const loteNumero = (result.max || 0) + 1;

    console.log(`\n📋 Criando lote #${String(loteNumero).padStart(4, '0')}...\n`);

    // Criar 3 OS no mesmo lote
    const suffixes = ['A', 'B', 'C'];
    const statuses = ['aberta', 'aprovada', 'concluida'];
    const defects = [
      'Não liga, possível problema no motor',
      'Fazendo barulho estranho ao girar',
      'Disco travando durante o uso',
    ];

    for (let i = 0; i < 3; i++) {
      const [order] = await db('service_orders').insert({
        tenant_id: tenantId,
        order_number: loteNumero,
        client_id: client.id,
        equipment_id: equipments[i].id,
        technician_id: technician.id,
        status: statuses[i],
        reported_defect: defects[i],
        entry_date: new Date().toISOString().split('T')[0],
        warranty_days: 90,
        lote_numero: loteNumero,
        lote_sufixo: suffixes[i],
      }).returning('*');

      // Adicionar itens para a OS concluída
      if (statuses[i] === 'concluida') {
        await db('service_order_items').insert([
          { service_order_id: order.id, quantity: 1, description: 'Mão de obra', unit_price: 80.00 },
          { service_order_id: order.id, quantity: 1, description: 'Troca de disco', unit_price: 45.00 },
        ]);
      }

      console.log(`✅ OS #${String(loteNumero).padStart(4, '0')}-${suffixes[i]} criada (${statuses[i]})`);
    }

    console.log('\n🎉 Seed de lote concluído com sucesso!');
    console.log('\n📝 Resumo:');
    console.log(`   Cliente: ${client.name}`);
    console.log(`   Equipamentos: 3`);
    console.log(`   Lote: #${String(loteNumero).padStart(4, '0')} (3 OS)`);
    console.log('\n💡 Acesse o sistema e veja o lote na listagem de OS.');

  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedLoteTest();
