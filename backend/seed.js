require('dotenv').config();
const crypto = require('crypto');
const db = require('./src/database/connection');

async function seed() {
  console.log('🌱 Populando banco de dados...\n');

  // 1. Criar técnicos
  const technicians = [
    { id: crypto.randomUUID(), name: 'Felipe Souza', phone: '21997471234', specialty: 'Serra mármore e furadeiras', active: true },
    { id: crypto.randomUUID(), name: 'Carlos Oliveira', phone: '21988765432', specialty: 'Parafusadeiras e esmerilhadeiras', active: true },
    { id: crypto.randomUUID(), name: 'Anderson Lima', phone: '21976543210', specialty: 'Ferramentas elétricas em geral', active: true },
  ];

  for (const tech of technicians) {
    const exists = await db('technicians').where({ name: tech.name }).whereNull('deleted_at').first();
    if (!exists) {
      await db('technicians').insert({ ...tech, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      console.log(`  ✅ Técnico: ${tech.name}`);
    } else {
      tech.id = exists.id;
      console.log(`  ⏩ Técnico já existe: ${tech.name}`);
    }
  }

  // 2. Criar 10 clientes com 3 equipamentos cada
  const clientsData = [
    { name: 'João da Silva', document: '52998224725', phone: '21999001001', city: 'Teresópolis', state: 'RJ' },
    { name: 'Maria Aparecida Santos', document: '83456789012', phone: '21999002002', city: 'Petrópolis', state: 'RJ' },
    { name: 'Roberto Ferreira', document: '71234567890', phone: '21999003003', city: 'Nova Friburgo', state: 'RJ' },
    { name: 'Ana Paula Rodrigues', document: '94567890123', phone: '21999004004', city: 'Teresópolis', state: 'RJ' },
    { name: 'Pedro Henrique Costa', document: '60123456789', phone: '21999005005', city: 'Petrópolis', state: 'RJ' },
    { name: 'Fernanda Almeida', document: '45678901234', phone: '21999006006', city: 'Teresópolis', state: 'RJ' },
    { name: 'Lucas Martins', document: '38901234567', phone: '21999007007', city: 'Magé', state: 'RJ' },
    { name: 'Patrícia Gomes', document: '27890123456', phone: '21999008008', city: 'Duque de Caxias', state: 'RJ' },
    { name: 'Marcos Vinícius Pereira', document: '16789012345', phone: '21999009009', city: 'São Gonçalo', state: 'RJ' },
    { name: 'Claudia Ribeiro', document: '89012345670', phone: '21999010010', city: 'Niterói', state: 'RJ' },
  ];

  const equipmentTypes = [
    { type: 'Serra Mármore', brand: 'Makita', model: '4100NH' },
    { type: 'Furadeira de Impacto', brand: 'Bosch', model: 'GSB 13 RE' },
    { type: 'Parafusadeira', brand: 'DeWalt', model: 'DCD796' },
    { type: 'Esmerilhadeira', brand: 'Makita', model: 'GA4530' },
    { type: 'Serra Tico-Tico', brand: 'Bosch', model: 'GST 650' },
    { type: 'Lixadeira Orbital', brand: 'Black+Decker', model: 'QS800' },
    { type: 'Tupia', brand: 'Makita', model: 'RT0700C' },
    { type: 'Plaina Elétrica', brand: 'Bosch', model: 'GHO 700' },
    { type: 'Serra Circular', brand: 'DeWalt', model: 'DWE560' },
    { type: 'Soprador Térmico', brand: 'Bosch', model: 'GHG 180' },
  ];

  const defects = [
    'Não liga ao pressionar o gatilho',
    'Fazendo barulho estranho no motor',
    'Disco travando durante o corte',
    'Esquentando demais após 5 minutos de uso',
    'Faísca excessiva nas escovas',
    'Mandril não trava a broca',
    'Vibração anormal durante uso',
    'Fio cortado próximo à entrada da máquina',
    'Chave de velocidade não funciona',
    'Não possui força, parece fraco',
  ];

  const diagnoses = [
    'Gatilho com contato queimado, necessário troca',
    'Rolamento do eixo desgastado',
    'Engrenagem com dentes quebrados',
    'Ventilador do motor quebrado, superaquecimento',
    'Escovas gastas, necessário substituição',
    'Mola do mandril partida',
    'Eixo empenado, substituição necessária',
    'Emenda no cabo e troca do plugue',
    'Potenciômetro queimado',
    'Bobina com curto-circuito, rebobinar estator',
  ];

  const statuses = ['aberta', 'aprovada', 'aguardando_peca', 'concluida', 'entregue'];
  const payments = ['Dinheiro', 'PIX', 'Cartão Crédito', 'Cartão Débito', 'Transferência'];

  let orderNumber = 2; // Já existe OS #1

  // Verificar maior order_number existente
  const maxOrder = await db('service_orders').max('order_number as max').first();
  if (maxOrder && maxOrder.max) {
    orderNumber = maxOrder.max + 1;
  }

  let eqIndex = 0;

  for (let i = 0; i < clientsData.length; i++) {
    const c = clientsData[i];

    // Verificar se cliente já existe
    let client = await db('clients').where({ document: c.document }).whereNull('deleted_at').first();
    if (!client) {
      const clientId = crypto.randomUUID();
      client = {
        id: clientId,
        name: c.name,
        document: c.document,
        phone: c.phone,
        email: '',
        address_street: 'Rua das Flores',
        address_number: String((i + 1) * 10),
        address_complement: '',
        address_neighborhood: 'Centro',
        address_city: c.city,
        address_state: c.state,
        address_zip: '25600000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db('clients').insert(client);
      console.log(`  ✅ Cliente: ${c.name}`);
    } else {
      console.log(`  ⏩ Cliente já existe: ${c.name}`);
    }

    // Criar 3 equipamentos por cliente
    const clientEquipment = [];
    for (let j = 0; j < 3; j++) {
      const eq = equipmentTypes[(eqIndex++) % equipmentTypes.length];
      const serial = `SN-${String(i + 1).padStart(2, '0')}${String(j + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

      let equipment = await db('equipment')
        .where({ client_id: client.id, type: eq.type, brand: eq.brand, model: eq.model })
        .whereNull('deleted_at')
        .first();

      if (!equipment) {
        const eqId = crypto.randomUUID();
        equipment = {
          id: eqId,
          client_id: client.id,
          type: eq.type,
          brand: eq.brand,
          model: eq.model,
          serial_number: serial,
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db('equipment').insert(equipment);
        console.log(`    📦 Equipamento: ${eq.type} ${eq.brand} ${eq.model}`);
      } else {
        console.log(`    ⏩ Equipamento já existe: ${eq.type} ${eq.brand}`);
      }
      clientEquipment.push(equipment);
    }

    // Criar 2 OS por equipamento (para os 3 equipamentos = 6 OS por cliente)
    // Mas o pedido foi 3 máquinas com 2 OS cada, então vou fazer só isso
    for (let j = 0; j < 3; j++) {
      const equip = clientEquipment[j];

      for (let k = 0; k < 2; k++) {
        const techIndex = (i + j + k) % technicians.length;
        const defectIndex = (i * 3 + j * 2 + k) % defects.length;
        const statusIndex = (i + j + k) % statuses.length;
        const payIndex = (i + k) % payments.length;

        const daysAgo = (k === 0) ? Math.floor(Math.random() * 60 + 30) : Math.floor(Math.random() * 15);
        const entryDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

        const osId = crypto.randomUUID();
        const now = new Date().toISOString();

        const order = {
          id: osId,
          order_number: orderNumber++,
          client_id: client.id,
          equipment_id: equip.id,
          technician_id: technicians[techIndex].id,
          status: statuses[statusIndex],
          reported_defect: defects[defectIndex],
          diagnosis: diagnoses[defectIndex],
          notes: '',
          payment_method: payments[payIndex],
          warranty_days: 90,
          entry_date: entryDate,
          completion_date: statusIndex >= 3 ? entryDate : null,
          created_at: now,
          updated_at: now,
        };

        await db('service_orders').insert(order);

        // Adicionar 2-3 itens por OS
        const numItems = Math.floor(Math.random() * 2) + 2;
        const items = [];
        const serviceDescriptions = [
          'Mão de obra - desmontagem e montagem',
          'Troca de escovas de carvão',
          'Troca de rolamento',
          'Troca de engrenagem',
          'Rebobinagem do estator',
          'Troca do cabo de força',
          'Troca do gatilho/interruptor',
          'Troca do mandril',
          'Limpeza e lubrificação geral',
          'Troca da correia',
        ];

        for (let m = 0; m < numItems; m++) {
          const descIdx = (defectIndex + m) % serviceDescriptions.length;
          items.push({
            id: crypto.randomUUID(),
            service_order_id: osId,
            quantity: m === 0 ? 1 : Math.floor(Math.random() * 2) + 1,
            description: serviceDescriptions[descIdx],
            unit_price: Math.floor(Math.random() * 150 + 30),
          });
        }
        await db('service_order_items').insert(items);

        console.log(`    📋 OS #${String(order.order_number).padStart(4, '0')} — ${equip.type} — ${statuses[statusIndex]}`);
      }
    }
  }

  console.log('\n✅ Seed finalizado!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
