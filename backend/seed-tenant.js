require('dotenv').config();
const db = require('./src/database/connection');

async function seedTenant() {
  // Pegar o primeiro tenant ativo (ESM / o do Master)
  const tenant = await db('tenants').where({ active: true }).first();
  if (!tenant) {
    console.error('❌ Nenhum tenant ativo encontrado');
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`🌱 Populando tenant: ${tenant.name} (${tenant.slug})\n`);

  // Técnicos
  const technicians = [
    { name: 'Fernando', phone: '21999996666', specialty: 'Ferramentas elétricas em geral' },
    { name: 'Igor', phone: '21988885555', specialty: 'Serra mármore e furadeiras' },
    { name: 'Felipe', phone: '21977774444', specialty: 'Parafusadeiras e esmerilhadeiras' },
  ];

  const techIds = [];
  for (const tech of technicians) {
    const exists = await db('technicians').where({ tenant_id: tenantId, name: tech.name }).whereNull('deleted_at').first();
    if (exists) {
      techIds.push(exists.id);
      console.log(`  ⏩ Técnico já existe: ${tech.name}`);
    } else {
      const [created] = await db('technicians').insert({ ...tech, tenant_id: tenantId, active: true }).returning('*');
      techIds.push(created.id);
      console.log(`  ✅ Técnico: ${tech.name}`);
    }
  }

  // Clientes
  const clientsData = [
    { name: 'João da Silva', document: '52998224725', phone: '21999001001', city: 'Teresópolis' },
    { name: 'Maria Santos', document: '83456789012', phone: '21999002002', city: 'Petrópolis' },
    { name: 'Roberto Ferreira', document: '71234567890', phone: '21999003003', city: 'Nova Friburgo' },
    { name: 'Ana Paula Rodrigues', document: '94567890123', phone: '21999004004', city: 'Teresópolis' },
    { name: 'Pedro Costa', document: '60123456789', phone: '21999005005', city: 'Petrópolis' },
    { name: 'Fernanda Almeida', document: '45678901234', phone: '21999006006', city: 'Teresópolis' },
    { name: 'Lucas Martins', document: '38901234567', phone: '21999007007', city: 'Magé' },
    { name: 'Patrícia Gomes', document: '27890123456', phone: '21999008008', city: 'Duque de Caxias' },
  ];

  const clientIds = [];
  for (const c of clientsData) {
    const exists = await db('clients').where({ tenant_id: tenantId, document: c.document }).whereNull('deleted_at').first();
    if (exists) {
      clientIds.push(exists.id);
      console.log(`  ⏩ Cliente já existe: ${c.name}`);
    } else {
      const [created] = await db('clients').insert({
        tenant_id: tenantId, name: c.name, document: c.document, phone: c.phone,
        address_city: c.city, address_state: 'RJ', address_neighborhood: 'Centro',
      }).returning('*');
      clientIds.push(created.id);
      console.log(`  ✅ Cliente: ${c.name}`);
    }
  }

  // Equipamentos (2 por cliente)
  const equipTypes = [
    { type: 'Serra Mármore', brand: 'Makita', model: '4100NH' },
    { type: 'Furadeira de Impacto', brand: 'Bosch', model: 'GSB 13 RE' },
    { type: 'Parafusadeira', brand: 'DeWalt', model: 'DCD796' },
    { type: 'Esmerilhadeira', brand: 'Makita', model: 'GA4530' },
    { type: 'Serra Tico-Tico', brand: 'Bosch', model: 'GST 650' },
    { type: 'Lixadeira Orbital', brand: 'Black+Decker', model: 'QS800' },
    { type: 'Tupia', brand: 'Makita', model: 'RT0700C' },
    { type: 'Plaina Elétrica', brand: 'Bosch', model: 'GHO 700' },
  ];

  const equipIds = [];
  let eqIdx = 0;
  for (let i = 0; i < clientIds.length; i++) {
    for (let j = 0; j < 2; j++) {
      const eq = equipTypes[(eqIdx++) % equipTypes.length];
      const serial = `SN-${String(i + 1).padStart(2, '0')}${j + 1}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const [created] = await db('equipment').insert({
        tenant_id: tenantId, client_id: clientIds[i],
        type: eq.type, brand: eq.brand, model: eq.model, serial_number: serial,
      }).returning('*');
      equipIds.push({ id: created.id, clientIdx: i });
      console.log(`    📦 ${eq.type} ${eq.brand} → ${clientsData[i].name}`);
    }
  }

  // OS (2 por equipamento = 32 OS)
  const defects = [
    'Não liga ao pressionar o gatilho',
    'Barulho estranho no motor',
    'Disco travando durante o corte',
    'Esquentando demais após 5 min',
    'Faísca excessiva nas escovas',
    'Mandril não trava a broca',
    'Vibração anormal',
    'Fio cortado na entrada',
  ];

  const diagnoses = [
    'Gatilho com contato queimado, troca necessária',
    'Rolamento desgastado',
    'Engrenagem com dentes quebrados',
    'Ventilador quebrado, superaquecimento',
    'Escovas gastas, substituir',
    'Mola do mandril partida',
    'Eixo empenado',
    'Emenda no cabo + troca do plugue',
  ];

  const statuses = ['aberta', 'aprovada', 'aguardando_peca', 'concluida', 'entregue'];
  const payments = ['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Transferência'];
  const services = [
    'Mão de obra - desmontagem e montagem',
    'Troca de escovas de carvão',
    'Troca de rolamento',
    'Troca de engrenagem',
    'Rebobinagem do estator',
    'Troca do cabo de força',
    'Troca do gatilho/interruptor',
    'Limpeza e lubrificação geral',
  ];

  let osCount = 0;
  for (let i = 0; i < equipIds.length; i++) {
    const eq = equipIds[i];
    for (let k = 0; k < 2; k++) {
      const techIdx = (i + k) % techIds.length;
      const statusIdx = (i + k) % statuses.length;
      const daysAgo = Math.floor(Math.random() * 45 + 5);
      const entryDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

      const [order] = await db('service_orders').insert({
        tenant_id: tenantId,
        order_number: osCount + 1,
        client_id: clientIds[eq.clientIdx],
        equipment_id: eq.id,
        technician_id: techIds[techIdx],
        status: statuses[statusIdx],
        reported_defect: defects[(i + k) % defects.length],
        diagnosis: diagnoses[(i + k) % diagnoses.length],
        payment_method: payments[(i + k) % payments.length],
        warranty_days: 90,
        entry_date: entryDate,
        completion_date: statusIdx >= 3 ? entryDate : null,
      }).returning('*');

      // Itens (2-3 por OS)
      const numItems = Math.floor(Math.random() * 2) + 2;
      for (let m = 0; m < numItems; m++) {
        await db('service_order_items').insert({
          service_order_id: order.id,
          quantity: m === 0 ? 1 : Math.floor(Math.random() * 2) + 1,
          description: services[(i + m) % services.length],
          unit_price: Math.floor(Math.random() * 120 + 30),
        });
      }

      osCount++;
      console.log(`    📋 OS #${String(osCount).padStart(4, '0')} — ${statuses[statusIdx]}`);
    }
  }

  // Lançamentos financeiros (baseados nas OS concluídas/entregues)
  const concludedOS = await db('service_orders')
    .where({ tenant_id: tenantId })
    .whereIn('status', ['concluida', 'entregue'])
    .whereNull('deleted_at');

  for (const os of concludedOS) {
    const items = await db('service_order_items').where({ service_order_id: os.id });
    const total = items.reduce((s, item) => s + item.quantity * item.unit_price, 0);

    await db('financial_entries').insert({
      tenant_id: tenantId,
      type: 'receita',
      description: `OS #${String(os.order_number).padStart(4, '0')}`,
      amount: total,
      due_date: os.completion_date || os.entry_date,
      status: Math.random() > 0.3 ? 'pago' : 'pendente',
      paid_date: Math.random() > 0.3 ? (os.completion_date || os.entry_date) : null,
      service_order_id: os.id,
    });
    console.log(`    💰 Receita: OS #${String(os.order_number).padStart(4, '0')} — R$ ${total.toFixed(2)}`);
  }

  // Algumas despesas
  const despesas = [
    { description: 'Compra de escovas de carvão (lote)', amount: 280 },
    { description: 'Rolamentos variados', amount: 450 },
    { description: 'Conta de luz do mês', amount: 320 },
    { description: 'Aluguel da loja', amount: 1500 },
    { description: 'Internet + telefone', amount: 180 },
  ];

  for (const d of despesas) {
    const daysAgo = Math.floor(Math.random() * 25 + 1);
    await db('financial_entries').insert({
      tenant_id: tenantId,
      type: 'despesa',
      description: d.description,
      amount: d.amount,
      due_date: new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0],
      status: Math.random() > 0.4 ? 'pago' : 'pendente',
    });
    console.log(`    💸 Despesa: ${d.description} — R$ ${d.amount.toFixed(2)}`);
  }

  console.log(`\n✅ Seed finalizado! ${osCount} OS, ${equipIds.length} equipamentos, ${clientsData.length} clientes`);
  process.exit(0);
}

seedTenant().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
