/**
 * Seed de teste para módulo Faturamento
 * Cria OS concluídas/entregues nos últimos 6 meses na conta Master
 * 
 * Uso: node seed-faturamento-test.js
 */

require('dotenv').config();
const db = require('./src/database/connection');

const TENANT_SLUG = 'master'; // Conta Empresa Master

async function seed() {
  console.log('🌱 Iniciando seed de faturamento para teste...\n');
  
  // Buscar tenant master
  const tenant = await db('tenants').where({ slug: TENANT_SLUG }).first();
  if (!tenant) {
    console.error('❌ Tenant "master" não encontrado!');
    process.exit(1);
  }
  console.log(`✓ Tenant encontrado: ${tenant.name} (${tenant.id})`);
  
  // Buscar ou criar clientes de teste
  const clientNames = [
    'João Silva Ferreira',
    'Maria Santos Costa',
    'Pedro Oliveira Lima',
    'Ana Paula Rodrigues',
    'Carlos Eduardo Alves',
    'Fernanda Dias Souza',
    'Roberto Mendes Filho',
    'Juliana Castro Reis'
  ];
  
  const clients = [];
  for (const name of clientNames) {
    let client = await db('clients')
      .where({ tenant_id: tenant.id, name })
      .whereNull('deleted_at')
      .first();
    
    if (!client) {
      const [newClient] = await db('clients').insert({
        tenant_id: tenant.id,
        name,
        phone: `(21) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).returning('*');
      client = newClient;
      console.log(`  + Cliente criado: ${name}`);
    }
    clients.push(client);
  }
  console.log(`✓ ${clients.length} clientes disponíveis\n`);
  
  // Buscar ou criar técnicos
  const techNames = ['Fernando', 'Igor', 'Carlos', 'Marcos'];
  const technicians = [];
  for (const name of techNames) {
    let tech = await db('technicians')
      .where({ tenant_id: tenant.id, name })
      .whereNull('deleted_at')
      .first();
    
    if (!tech) {
      const [newTech] = await db('technicians').insert({
        tenant_id: tenant.id,
        name,
        phone: `(21) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        specialty: 'Ferramentas elétricas',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).returning('*');
      tech = newTech;
      console.log(`  + Técnico criado: ${name}`);
    }
    technicians.push(tech);
  }
  console.log(`✓ ${technicians.length} técnicos disponíveis\n`);
  
  // Tipos de equipamentos
  const equipmentTypes = [
    { type: 'Esmerilhadeira', brand: 'Dewalt', model: 'DWE4020' },
    { type: 'Furadeira', brand: 'Bosch', model: 'GSB 13 RE' },
    { type: 'Serra Circular', brand: 'Makita', model: '5007MG' },
    { type: 'Martelete', brand: 'Bosch', model: 'GBH 2-24D' },
    { type: 'Plaina', brand: 'Makita', model: 'KP0800' },
    { type: 'Lixadeira', brand: 'Dewalt', model: 'DWE6411' },
    { type: 'Tupia', brand: 'Makita', model: 'RT0700C' },
    { type: 'Parafusadeira', brand: 'Bosch', model: 'GSR 120-LI' },
    { type: 'Policorte', brand: 'Dewalt', model: 'D28730' },
    { type: 'Serra Tico-Tico', brand: 'Bosch', model: 'GST 75' }
  ];
  
  // Serviços comuns
  const services = [
    { desc: 'Mão de obra', min: 50, max: 120 },
    { desc: 'Troca de carvão', min: 20, max: 45 },
    { desc: 'Troca de rolamento', min: 35, max: 80 },
    { desc: 'Limpeza interna', min: 25, max: 50 },
    { desc: 'Troca de engrenagem', min: 60, max: 150 },
    { desc: 'Reparo no estator', min: 80, max: 200 },
    { desc: 'Troca de interruptor', min: 30, max: 70 },
    { desc: 'Revisão completa', min: 100, max: 250 }
  ];
  
  // Pegar próximo order_number
  const lastOS = await db('service_orders')
    .where({ tenant_id: tenant.id })
    .orderBy('order_number', 'desc')
    .first();
  let orderNumber = (lastOS?.order_number || 0) + 1;
  
  // Gerar OS para os últimos 6 meses
  const now = new Date();
  let totalOS = 0;
  let totalValue = 0;
  
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    // Quantidade de OS por mês (crescente para simular crescimento)
    const osCount = Math.floor(Math.random() * 5) + 5 + (5 - monthsAgo) * 2;
    
    console.log(`📅 ${monthName}: criando ${osCount} OS...`);
    
    for (let i = 0; i < osCount; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const tech = technicians[Math.floor(Math.random() * technicians.length)];
      const equipType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
      
      // Criar equipamento
      const [equipment] = await db('equipment').insert({
        tenant_id: tenant.id,
        client_id: client.id,
        type: equipType.type,
        brand: equipType.brand,
        model: equipType.model,
        serial_number: `SN${Date.now()}${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).returning('*');
      
      // Datas aleatórias dentro do mês
      const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const entryDay = Math.floor(Math.random() * (daysInMonth - 5)) + 1;
      const completionDay = entryDay + Math.floor(Math.random() * 5) + 1;
      
      const entryDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), entryDay);
      const completionDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), Math.min(completionDay, daysInMonth));
      
      // Status: 70% entregue, 30% concluída
      const status = Math.random() > 0.3 ? 'entregue' : 'concluida';
      
      // Criar OS
      const [os] = await db('service_orders').insert({
        tenant_id: tenant.id,
        order_number: orderNumber++,
        client_id: client.id,
        equipment_id: equipment.id,
        technician_id: tech.id,
        status,
        reported_defect: `Equipamento apresentando problema de funcionamento`,
        diagnosis: `Verificado e reparado com sucesso`,
        payment_method: ['PIX', 'Dinheiro', 'Cartão Crédito', 'Cartão Débito'][Math.floor(Math.random() * 4)],
        warranty_days: 90,
        entry_date: entryDate.toISOString().split('T')[0],
        completion_date: completionDate.toISOString().split('T')[0],
        created_at: entryDate.toISOString(),
        updated_at: completionDate.toISOString()
      }).returning('*');
      
      // Adicionar 1-3 itens (serviços)
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const usedServices = new Set();
      let osTotal = 0;
      
      for (let j = 0; j < itemCount; j++) {
        let service;
        do {
          service = services[Math.floor(Math.random() * services.length)];
        } while (usedServices.has(service.desc));
        usedServices.add(service.desc);
        
        const price = Math.floor(Math.random() * (service.max - service.min)) + service.min;
        osTotal += price;
        
        await db('service_order_items').insert({
          service_order_id: os.id,
          quantity: 1,
          description: service.desc,
          unit_price: price
        });
      }
      
      totalOS++;
      totalValue += osTotal;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Seed concluído!`);
  console.log(`   📋 ${totalOS} OS criadas`);
  console.log(`   💰 R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em faturamento total`);
  console.log(`   📊 Distribuídas nos últimos 6 meses`);
  console.log('='.repeat(50));
  
  await db.destroy();
}

seed().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
