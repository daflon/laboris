require('dotenv').config();
const db = require('./src/database/connection');
const bcrypt = require('bcryptjs');

async function createESM() {
  // Verificar se já existe
  const existing = await db('tenants').where({ slug: 'esm' }).first();
  if (existing) {
    console.log('⚠️  Tenant ESM já existe:', existing.id);
    process.exit(0);
  }

  // Criar tenant ESM
  const [tenant] = await db('tenants').insert({
    name: 'Eletrotécnica São Miguel',
    slug: 'esm',
    modules: JSON.stringify(['os']),
    active: true,
  }).returning('*');

  console.log('✅ Tenant ESM criado:', tenant.id);

  // Criar user admin da ESM
  const hash = await bcrypt.hash('esm123', 10);
  const [user] = await db('users').insert({
    tenant_id: tenant.id,
    name: 'Admin ESM',
    email: 'esm@oslaboris.com',
    password_hash: hash,
    role: 'tenant_user',
  }).returning('*');

  console.log('✅ User ESM criado:', user.email);

  // Criar company_settings da ESM
  await db('company_settings').insert({
    tenant_id: tenant.id,
    name: 'Eletrotécnica São Miguel',
    phone: '2197547352',
    address_street: 'Rua São Francisco',
    address_number: '02',
    address_neighborhood: 'Nossa Senhora de Fátima',
    address_city: 'Teresópolis',
    address_state: 'RJ',
  });

  console.log('✅ Configurações da ESM criadas');
  console.log('\n📋 Dados de acesso ESM:');
  console.log('   Email: esm@oslaboris.com');
  console.log('   Senha: esm123');

  process.exit(0);
}

createESM().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
