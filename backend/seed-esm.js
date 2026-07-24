require('dotenv').config();
const db = require('./src/database/connection');

async function seedESM() {
  const tenant = await db('tenants').where({ slug: 'esm' }).first();
  if (!tenant) { console.error('❌ Tenant ESM não encontrado'); process.exit(1); }

  const tenantId = tenant.id;
  console.log(`🌱 Seed na conta ESM (${tenantId})\n`);

  // Técnicos
  const techs = [
    { name: 'Marcos', phone: '21975473524', specialty: 'Serra mármore' },
    { name: 'Junior', phone: '21988001122', specialty: 'Furadeiras e parafusadeiras' },
  ];

  const techIds = [];
  for (const t of techs) {
    let existing = await db('technicians').where({ tenant_id: tenantId, name: t.name }).whereNull('deleted_at').first();
    if (!existing) {
      const [created] = await db('technicians').insert({ ...t, tenant_id: tenantId, active: true }).returning('*');
      existing = created;
      console.log(`  ✅ Técnico: ${t.name}`);
    } else { console.log(`  ⏩ Técnico: ${t.name}`); techIds.push(existing.id); continue; }
    techIds.push(existing.id);
  }

  // Clientes
  const clients = [
    { name: 'José Oliveira', document: '12312312300', phone: '21991110001' },
    { name: 'Sandra Costa', document: '45645645600', phone: '21992220002' },
  ];

  const clientIds = [];
  for (const c of clients) {
    let existing = await db('clients').where({ tenant_id: tenantId, document: c.document }).whereNull('deleted_at').first();
    if (!existing) {
      const [created] = await db('clients').insert({ ...c, tenant_id: tenantId, address_city: 'Teresópolis', address_state: 'RJ' }).returning('*');
      existing = created;
      console.log(`  ✅ Cliente: ${c.name}`);
    } else { console.log(`  ⏩ Cliente: ${c.name}`); }
    clientIds.push(existing.id);
  }

  // Equipamentos
  const equips = [
    { type: 'Serra Mármore', brand: 'Makita', model: '4100NH3' },
    { type: 'Furadeira', brand: 'Bosch', model: 'GSB 550 RE' },
    { type: 'Parafusadeira', brand: 'DeWalt', model: 'DCD777' },
  ];

  const equipIds = [];
  for (let i = 0; i < equips.length; i++) {
    const eq = equips[i];
    const clientIdx = i < 2 ? 0 : 1;
    const [created] = await db('equipment').insert({ ...eq, tenant_id: tenantId, client_id: clientIds[clientIdx], serial_number: `ESM-${i + 1}` }).returning('*');
    equipIds.push({ id: created.id, clientIdx });
    console.log(`    📦 ${eq.type} ${eq.brand} → ${clients[clientIdx].name}`);
  }

  // OS
  const maxOS = await db('service_orders').where({ tenant_id: tenantId }).max('order_number as max').first();
  const startNum = (maxOS.max || 0) + 1;
  const statuses = ['aberta', 'aprovada', 'concluida'];
  const defects = ['Não liga', 'Motor fraco', 'Faísca excessiva'];

  for (let i = 0; i < 3; i++) {
    const eq = equipIds[i];
    const daysAgo = Math.floor(Math.random() * 10 + 2);
    const entryDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    const [order] = await db('service_orders').insert({
      tenant_id: tenantId,
      order_number: startNum + i,
      client_id: clientIds[eq.clientIdx],
      equipment_id: eq.id,
      technician_id: techIds[i % techIds.length],
      status: statuses[i],
      reported_defect: defects[i],
      payment_method: 'PIX',
      warranty_days: 90,
      entry_date: entryDate,
      completion_date: statuses[i] === 'concluida' ? entryDate : null,
    }).returning('*');

    await db('service_order_items').insert([
      { service_order_id: order.id, quantity: 1, description: 'Mão de obra', unit_price: 70 },
      { service_order_id: order.id, quantity: 1, description: 'Peça', unit_price: Math.floor(Math.random() * 80 + 40) },
    ]);

    console.log(`    📋 OS #${String(startNum + i).padStart(4, '0')} — ${statuses[i]}`);
  }

  console.log('\n✅ Seed ESM finalizado!');
  process.exit(0);
}

seedESM().catch(e => { console.error('❌', e.message); process.exit(1); });
