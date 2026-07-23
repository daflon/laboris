require('dotenv').config();
const db = require('./src/database/connection');

async function cleanESM() {
  // Encontrar o tenant ESM (não é o master — o master usa o mesmo tenant via impersonate)
  // O tenant que queremos limpar é o único que existe
  const tenant = await db('tenants').first();
  if (!tenant) {
    console.log('❌ Nenhum tenant encontrado');
    process.exit(1);
  }

  console.log(`🧹 Limpando dados do tenant: ${tenant.name} (${tenant.slug})\n`);

  // Limpar na ordem certa (respeitar FK)
  const deletedItems = await db('service_order_items')
    .whereIn('service_order_id', db('service_orders').where({ tenant_id: tenant.id }).select('id'))
    .del();
  console.log(`  ✅ ${deletedItems} itens de OS removidos`);

  const deletedFinanceiro = await db('financial_entries').where({ tenant_id: tenant.id }).del();
  console.log(`  ✅ ${deletedFinanceiro} lançamentos financeiros removidos`);

  const deletedOS = await db('service_orders').where({ tenant_id: tenant.id }).del();
  console.log(`  ✅ ${deletedOS} ordens de serviço removidas`);

  const deletedEquip = await db('equipment').where({ tenant_id: tenant.id }).del();
  console.log(`  ✅ ${deletedEquip} equipamentos removidos`);

  const deletedTechs = await db('technicians').where({ tenant_id: tenant.id }).del();
  console.log(`  ✅ ${deletedTechs} técnicos removidos`);

  const deletedClients = await db('clients').where({ tenant_id: tenant.id }).del();
  console.log(`  ✅ ${deletedClients} clientes removidos`);

  const deletedAudit = await db('audit_logs').where({ tenant_id: tenant.id }).del();
  console.log(`  ✅ ${deletedAudit} logs de auditoria removidos`);

  console.log('\n✅ Tenant limpo! Conta e configurações mantidas.');
  process.exit(0);
}

cleanESM().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
