require('dotenv').config();
const db = require('./src/database/connection');

/**
 * Seed para testar os indicadores de:
 * - OS antigas (> 30 dias)
 * - Equipamentos > 180 dias sem retirada
 */
async function seedAlertsTest() {
  const tenant = await db('tenants').where({ slug: 'master' }).first();
  if (!tenant) { 
    console.error('❌ Tenant master não encontrado'); 
    process.exit(1); 
  }

  const tenantId = tenant.id;
  console.log(`\n🧪 Seed de Teste - Alertas (Tenant: ${tenant.name})\n`);

  // Buscar ou criar um cliente de teste
  let testClient = await db('clients')
    .where({ tenant_id: tenantId, name: 'Cliente Teste Alertas' })
    .whereNull('deleted_at')
    .first();

  if (!testClient) {
    [testClient] = await db('clients').insert({
      tenant_id: tenantId,
      name: 'Cliente Teste Alertas',
      document: '99999999999',
      phone: '21999999999',
      address_city: 'Rio de Janeiro',
      address_state: 'RJ'
    }).returning('*');
    console.log('  ✅ Cliente criado: Cliente Teste Alertas');
  } else {
    console.log('  ⏩ Cliente existe: Cliente Teste Alertas');
  }

  // Buscar ou criar um técnico
  let testTech = await db('technicians')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();

  if (!testTech) {
    [testTech] = await db('technicians').insert({
      tenant_id: tenantId,
      name: 'Técnico Teste',
      phone: '21988888888',
      specialty: 'Geral',
      active: true
    }).returning('*');
    console.log('  ✅ Técnico criado: Técnico Teste');
  }

  // Próximo número de OS
  const maxOS = await db('service_orders').where({ tenant_id: tenantId }).max('order_number as max').first();
  let orderNumber = (maxOS.max || 0) + 1;

  console.log('\n📦 Criando equipamentos e OS de teste...\n');

  // ========================================
  // 1. OS antiga (45 dias) - status aberta
  // ========================================
  const [equip1] = await db('equipment').insert({
    tenant_id: tenantId,
    client_id: testClient.id,
    type: 'Furadeira',
    brand: 'Bosch',
    model: 'GSB 13 RE',
    serial_number: `TEST-OLD-${Date.now()}-1`
  }).returning('*');

  const entryDate45 = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [os1] = await db('service_orders').insert({
    tenant_id: tenantId,
    order_number: orderNumber++,
    client_id: testClient.id,
    equipment_id: equip1.id,
    technician_id: testTech.id,
    status: 'aberta',
    reported_defect: 'Não liga - OS DE TESTE (45 dias)',
    payment_method: 'PIX',
    warranty_days: 90,
    entry_date: entryDate45
  }).returning('*');

  console.log(`  ⏰ OS #${String(os1.order_number).padStart(4, '0')} - 45 dias (aberta)`);

  // ========================================
  // 2. OS antiga (60 dias) - status aprovada
  // ========================================
  const [equip2] = await db('equipment').insert({
    tenant_id: tenantId,
    client_id: testClient.id,
    type: 'Serra Mármore',
    brand: 'Makita',
    model: '4100NH',
    serial_number: `TEST-OLD-${Date.now()}-2`
  }).returning('*');

  const entryDate60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [os2] = await db('service_orders').insert({
    tenant_id: tenantId,
    order_number: orderNumber++,
    client_id: testClient.id,
    equipment_id: equip2.id,
    technician_id: testTech.id,
    status: 'aprovada',
    reported_defect: 'Disco travando - OS DE TESTE (60 dias)',
    payment_method: 'Cartão',
    warranty_days: 90,
    entry_date: entryDate60
  }).returning('*');

  console.log(`  ⏰ OS #${String(os2.order_number).padStart(4, '0')} - 60 dias (aprovada)`);

  // ========================================
  // 3. Equipamento > 180 dias (abandonado)
  // ========================================
  const [equip3] = await db('equipment').insert({
    tenant_id: tenantId,
    client_id: testClient.id,
    type: 'Esmerilhadeira',
    brand: 'DeWalt',
    model: 'DWE4020',
    serial_number: `TEST-ABANDONED-${Date.now()}`
  }).returning('*');

  const entryDate200 = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [os3] = await db('service_orders').insert({
    tenant_id: tenantId,
    order_number: orderNumber++,
    client_id: testClient.id,
    equipment_id: equip3.id,
    technician_id: testTech.id,
    status: 'concluida',
    reported_defect: 'Vibração anormal - EQUIPAMENTO ABANDONADO (200 dias)',
    payment_method: 'Dinheiro',
    warranty_days: 90,
    entry_date: entryDate200,
    completion_date: new Date(Date.now() - 190 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }).returning('*');

  console.log(`  ⚠️ OS #${String(os3.order_number).padStart(4, '0')} - 200 dias (concluída, não retirada)`);

  // ========================================
  // 4. Outro equipamento > 180 dias
  // ========================================
  const [equip4] = await db('equipment').insert({
    tenant_id: tenantId,
    client_id: testClient.id,
    type: 'Parafusadeira',
    brand: 'Black+Decker',
    model: 'LD120',
    serial_number: `TEST-ABANDONED-${Date.now()}-2`
  }).returning('*');

  const entryDate185 = new Date(Date.now() - 185 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [os4] = await db('service_orders').insert({
    tenant_id: tenantId,
    order_number: orderNumber++,
    client_id: testClient.id,
    equipment_id: equip4.id,
    technician_id: testTech.id,
    status: 'aguardando_peca',
    reported_defect: 'Bateria não carrega - EQUIPAMENTO ABANDONADO (185 dias)',
    payment_method: 'PIX',
    warranty_days: 90,
    entry_date: entryDate185
  }).returning('*');

  console.log(`  ⚠️ OS #${String(os4.order_number).padStart(4, '0')} - 185 dias (aguardando peça)`);

  console.log('\n✅ Seed de alertas concluído!');
  console.log('\n📊 Resumo:');
  console.log('   - 2 OS antigas (> 30 dias)');
  console.log('   - 2 equipamentos abandonados (> 180 dias)');
  console.log('\n💡 Acesse o Dashboard e a Lista de OS para ver os indicadores.\n');

  process.exit(0);
}

seedAlertsTest().catch(e => { 
  console.error('❌ Erro:', e.message); 
  process.exit(1); 
});
