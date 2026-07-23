require('dotenv').config();
const db = require('./src/database/connection');

async function seedMaster() {
  const tenant = await db('tenants').where({ slug: 'master' }).first();
  if (!tenant) { console.error('❌ Tenant master não encontrado'); process.exit(1); }

  const tenantId = tenant.id;
  console.log(`🌱 Seed na conta Master (${tenantId})\n`);

  // Técnicos
  const techs = [
    { name: 'Fernando', phone: '21999996666', specialty: 'Ferramentas elétricas em geral' },
    { name: 'Igor', phone: '21988885555', specialty: 'Serra mármore e furadeiras' },
    { name: 'Felipe', phone: '21977774444', specialty: 'Parafusadeiras e esmerilhadeiras' },
  ];

  const techIds = [];
  for (const t of techs) {
    let existing = await db('technicians').where({ tenant_id: tenantId, name: t.name }).whereNull('deleted_at').first();
    if (!existing) {
      const [created] = await db('technicians').insert({ ...t, tenant_id: tenantId, active: true }).returning('*');
      existing = created;
      console.log(`  ✅ Técnico: ${t.name}`);
    } else { console.log(`  ⏩ Técnico: ${t.name}`); }
    techIds.push(existing.id);
  }

  // Clientes
  const clients = [
    { name: 'Carlos Mendes', document: '11122233344', phone: '21991001001' },
    { name: 'Luciana Ferreira', document: '55566677788', phone: '21992002002' },
    { name: 'Rafael Souza', document: '99988877700', phone: '21993003003' },
  ];

  const clientIds = [];
  for (const c of clients) {
    let existing = await db('clients').where({ tenant_id: tenantId, document: c.document }).whereNull('deleted_at').first();
    if (!existing) {
      const [created] = await db('clients').insert({ ...c, tenant_id: tenantId, address_city: 'Rio de Janeiro', address_state: 'RJ' }).returning('*');
      existing = created;
      console.log(`  ✅ Cliente: ${c.name}`);
    } else { console.log(`  ⏩ Cliente: ${c.name}`); }
    clientIds.push(existing.id);
  }

  // Equipamentos (2 por cliente)
  const equips = [
    { type: 'Serra Mármore', brand: 'Makita', model: '4100NH' },
    { type: 'Furadeira', brand: 'Bosch', model: 'GSB 13 RE' },
    { type: 'Parafusadeira', brand: 'DeWalt', model: 'DCD796' },
    { type: 'Esmerilhadeira', brand: 'Makita', model: 'GA4530' },
    { type: 'Serra Tico-Tico', brand: 'Bosch', model: 'GST 650' },
    { type: 'Lixadeira', brand: 'Black+Decker', model: 'QS800' },
  ];

  const equipIds = [];
  let eqIdx = 0;
  for (let i = 0; i < clientIds.length; i++) {
    for (let j = 0; j < 2; j++) {
      const eq = equips[eqIdx++ % equips.length];
      const [created] = await db('equipment').insert({ ...eq, tenant_id: tenantId, client_id: clientIds[i], serial_number: `SN-${eqIdx}${Math.floor(Math.random() * 9000 + 1000)}` }).returning('*');
      equipIds.push({ id: created.id, clientIdx: i });
      console.log(`    📦 ${eq.type} ${eq.brand} → ${clients[i].name}`);
    }
  }

  // OS (1 por equipamento = 6 OS)
  const defects = ['Não liga', 'Barulho no motor', 'Disco travando', 'Esquentando muito', 'Faísca nas escovas', 'Vibração anormal'];
  const statuses = ['aberta', 'aprovada', 'aguardando_peca', 'concluida', 'entregue', 'aberta'];

  const maxOS = await db('service_orders').where({ tenant_id: tenantId }).max('order_number as max').first();
  const startNum = (maxOS.max || 0) + 1;

  for (let i = 0; i < equipIds.length; i++) {
    const eq = equipIds[i];
    const daysAgo = Math.floor(Math.random() * 20 + 3);
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
      completion_date: statuses[i] === 'concluida' || statuses[i] === 'entregue' ? entryDate : null,
    }).returning('*');

    // 2 itens por OS
    await db('service_order_items').insert([
      { service_order_id: order.id, quantity: 1, description: 'Mão de obra', unit_price: 80 },
      { service_order_id: order.id, quantity: 1, description: 'Peça de reposição', unit_price: Math.floor(Math.random() * 100 + 50) },
    ]);

    console.log(`    📋 OS #${String(i + 1).padStart(4, '0')} — ${statuses[i]}`);
  }

  console.log('\n✅ Seed finalizado! 3 técnicos, 3 clientes, 6 equipamentos, 6 OS');
  process.exit(0);
}

seedMaster().catch(e => { console.error('❌', e.message); process.exit(1); });
