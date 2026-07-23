require('dotenv').config();
const db = require('./src/database/connection');

async function fix() {
  // Listar tenants
  const tenants = await db('tenants').select('*');
  console.log('Tenants existentes:');
  tenants.forEach(t => console.log(`  - ${t.name} (${t.slug}) ID: ${t.id}`));

  // O tenant original (c8659485...) é o do Master (Empresa Master)
  // O tenant novo (cd2d295a...) é o ESM
  const masterTenant = tenants.find(t => t.id === 'c8659485-b234-4723-9681-1e71ee94ac3b');
  const esmTenant = tenants.find(t => t.slug === 'esm');

  if (!masterTenant || !esmTenant) {
    console.log('❌ Não encontrei os dois tenants');
    process.exit(1);
  }

  // Mover o user esm@oslaboris.com para o tenant ESM
  await db('users').where({ email: 'esm@oslaboris.com' }).update({ tenant_id: esmTenant.id });
  console.log('\n✅ User esm@oslaboris.com movido para tenant ESM');

  // Garantir que o tenant do master tenha o nome correto
  await db('tenants').where({ id: masterTenant.id }).update({ name: 'Empresa Master', slug: 'master' });
  console.log('✅ Tenant master renomeado para "Empresa Master" (slug: master)');

  // Atualizar company_settings do master
  await db('company_settings').where({ tenant_id: masterTenant.id }).update({ name: 'Empresa Master' });
  console.log('✅ Company settings do master atualizadas');

  console.log('\n📋 Situação final:');
  console.log(`   Master (seu): ${masterTenant.id} — login: admin@oslaboris.com → "Meu App" vai pra este`);
  console.log(`   ESM (cliente): ${esmTenant.id} — login: esm@oslaboris.com / esm123`);

  process.exit(0);
}

fix().catch(e => { console.error('❌', e.message); process.exit(1); });
