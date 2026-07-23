/**
 * Teste de Isolamento Multi-tenant
 * 
 * Este script:
 * 1. Cria um segundo tenant (Empresa B) com user
 * 2. Cria dados na Empresa B (cliente, técnico, equipamento, OS)
 * 3. Loga como Empresa B e verifica que SÓ vê os dados dela
 * 4. Loga como ESM (Empresa A) e verifica que NÃO vê dados da Empresa B
 * 5. Limpa os dados de teste
 */

require('dotenv').config();
const db = require('./src/database/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'oslaboris_dev_secret';

let tenantB_id, userB_id, clientB_id, techB_id, equipB_id, osB_id;

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

function generateTestToken(userId, tenantId, role) {
  return jwt.sign({ userId, tenantId, role, email: 'test@test.com' }, JWT_SECRET, { expiresIn: '1h' });
}

async function setup() {
  console.log('\n🔧 SETUP: Criando Tenant B (Empresa de Teste)...\n');

  // Criar Tenant B
  const [tenantB] = await db('tenants').insert({
    name: 'Empresa Teste B',
    slug: 'empresa-teste-b',
    modules: JSON.stringify(['os', 'financeiro']),
  }).returning('*');
  tenantB_id = tenantB.id;
  console.log(`  ✅ Tenant B criado: ${tenantB_id}`);

  // Criar User B
  const hash = await bcrypt.hash('teste123', 10);
  const [userB] = await db('users').insert({
    tenant_id: tenantB_id,
    name: 'Admin Empresa B',
    email: 'admin@empresab.com',
    password_hash: hash,
    role: 'tenant_user',
  }).returning('*');
  userB_id = userB.id;
  console.log(`  ✅ User B criado: ${userB_id}`);

  // Criar dados na Empresa B
  const [clientB] = await db('clients').insert({
    tenant_id: tenantB_id,
    name: 'Cliente Exclusivo B',
    document: '99988877766',
    phone: '11999990000',
  }).returning('*');
  clientB_id = clientB.id;

  const [techB] = await db('technicians').insert({
    tenant_id: tenantB_id,
    name: 'Tecnico Exclusivo B',
    phone: '11888880000',
    active: true,
  }).returning('*');
  techB_id = techB.id;

  const [equipB] = await db('equipment').insert({
    tenant_id: tenantB_id,
    client_id: clientB_id,
    type: 'Furadeira Secreta',
    brand: 'MarcaB',
    model: 'ModeloB',
  }).returning('*');
  equipB_id = equipB.id;

  const [osB] = await db('service_orders').insert({
    tenant_id: tenantB_id,
    order_number: 1,
    client_id: clientB_id,
    equipment_id: equipB_id,
    technician_id: techB_id,
    status: 'aberta',
    reported_defect: 'Defeito secreto da empresa B',
    entry_date: '2026-07-23',
  }).returning('*');
  osB_id = osB.id;

  console.log('  ✅ Dados da Empresa B criados (cliente, técnico, equipamento, OS)\n');
}

async function testIsolation() {
  console.log('🧪 TESTES DE ISOLAMENTO\n');
  let passed = 0;
  let failed = 0;

  // Pegar o tenant A (ESM)
  const tenantA = await db('tenants').where('slug', '!=', 'empresa-teste-b').first();
  if (!tenantA) { console.log('❌ Tenant A não encontrado'); return; }

  const userA = await db('users').where({ tenant_id: tenantA.id }).first();
  if (!userA) { console.log('❌ User A não encontrado'); return; }

  const tokenA = generateTestToken(userA.id, tenantA.id, 'tenant_user');
  const tokenB = generateTestToken(userB_id, tenantB_id, 'tenant_user');

  // --- TESTE 1: Empresa B vê seus próprios dados ---
  console.log('  📋 Teste 1: Empresa B vê seus dados...');
  const resB_clients = await request('GET', '/clients', null, tokenB);
  const foundB = resB_clients.data.data?.some(c => c.name === 'Cliente Exclusivo B');
  if (foundB) { console.log('    ✅ Empresa B vê seu cliente'); passed++; }
  else { console.log('    ❌ Empresa B NÃO vê seu cliente'); failed++; }

  const resB_os = await request('GET', '/service-orders', null, tokenB);
  const foundOS_B = resB_os.data.data?.some(o => o.reported_defect === 'Defeito secreto da empresa B');
  if (foundOS_B) { console.log('    ✅ Empresa B vê sua OS'); passed++; }
  else { console.log('    ❌ Empresa B NÃO vê sua OS'); failed++; }

  // --- TESTE 2: Empresa A NÃO vê dados da Empresa B ---
  console.log('  📋 Teste 2: Empresa A NÃO vê dados da Empresa B...');
  const resA_clients = await request('GET', '/clients', null, tokenA);
  const leakedClient = resA_clients.data.data?.some(c => c.name === 'Cliente Exclusivo B');
  if (!leakedClient) { console.log('    ✅ Empresa A NÃO vê cliente da B (isolado)'); passed++; }
  else { console.log('    ❌ VAZAMENTO! Empresa A vê cliente da B!'); failed++; }

  const resA_os = await request('GET', '/service-orders', null, tokenA);
  const leakedOS = resA_os.data.data?.some(o => o.reported_defect === 'Defeito secreto da empresa B');
  if (!leakedOS) { console.log('    ✅ Empresa A NÃO vê OS da B (isolado)'); passed++; }
  else { console.log('    ❌ VAZAMENTO! Empresa A vê OS da B!'); failed++; }

  const resA_techs = await request('GET', '/technicians', null, tokenA);
  const leakedTech = resA_techs.data.data?.some(t => t.name === 'Tecnico Exclusivo B');
  if (!leakedTech) { console.log('    ✅ Empresa A NÃO vê técnico da B (isolado)'); passed++; }
  else { console.log('    ❌ VAZAMENTO! Empresa A vê técnico da B!'); failed++; }

  const resA_equip = await request('GET', '/equipment', null, tokenA);
  const leakedEquip = resA_equip.data.data?.some(e => e.type === 'Furadeira Secreta');
  if (!leakedEquip) { console.log('    ✅ Empresa A NÃO vê equipamento da B (isolado)'); passed++; }
  else { console.log('    ❌ VAZAMENTO! Empresa A vê equipamento da B!'); failed++; }

  // --- TESTE 3: Empresa B NÃO vê dados da Empresa A ---
  console.log('  📋 Teste 3: Empresa B NÃO vê dados da Empresa A...');
  const countA_clients = resA_clients.data.data?.length || 0;
  const countB_clients = resB_clients.data.data?.length || 0;
  if (countB_clients < countA_clients) { console.log(`    ✅ Empresa B (${countB_clients} clientes) vê menos que A (${countA_clients})`); passed++; }
  else if (countB_clients === 1) { console.log(`    ✅ Empresa B vê apenas 1 cliente (o dela)`); passed++; }
  else { console.log(`    ⚠️  Empresa B vê ${countB_clients} clientes — verificar`); }

  // --- TESTE 4: Acesso direto a recurso de outro tenant ---
  console.log('  📋 Teste 4: Acesso direto a recurso de outro tenant...');
  const resA_directOS = await request('GET', `/service-orders/${osB_id}`, null, tokenA);
  if (resA_directOS.status === 404 || !resA_directOS.data.data) {
    console.log('    ✅ Empresa A NÃO acessa OS da B por ID (404)'); passed++;
  } else {
    console.log('    ❌ VAZAMENTO! Empresa A acessou OS da B por ID direto!'); failed++;
  }

  const resA_directClient = await request('GET', `/clients/${clientB_id}`, null, tokenA);
  if (resA_directClient.status === 404 || !resA_directClient.data.data) {
    console.log('    ✅ Empresa A NÃO acessa cliente da B por ID (404)'); passed++;
  } else {
    console.log('    ❌ VAZAMENTO! Empresa A acessou cliente da B por ID direto!'); failed++;
  }

  // --- RESULTADO ---
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  RESULTADO: ${passed} passaram, ${failed} falharam`);
  if (failed === 0) {
    console.log('  🎉 TODOS OS TESTES DE ISOLAMENTO PASSARAM!');
  } else {
    console.log('  ⚠️  ATENÇÃO: Existem vazamentos de dados entre tenants!');
  }
  console.log(`${'='.repeat(50)}\n`);
}

async function cleanup() {
  console.log('🧹 CLEANUP: Removendo dados de teste...');
  await db('service_orders').where({ tenant_id: tenantB_id }).del();
  await db('equipment').where({ tenant_id: tenantB_id }).del();
  await db('technicians').where({ tenant_id: tenantB_id }).del();
  await db('clients').where({ tenant_id: tenantB_id }).del();
  await db('users').where({ tenant_id: tenantB_id }).del();
  await db('company_settings').where({ tenant_id: tenantB_id }).del();
  await db('tenants').where({ id: tenantB_id }).del();
  console.log('  ✅ Dados de teste removidos\n');
}

async function run() {
  try {
    await setup();
    await testIsolation();
    await cleanup();
  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
  process.exit(0);
}

run();
