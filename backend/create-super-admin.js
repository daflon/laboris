require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/database/connection');

async function createSuperAdmin() {
  const email = process.argv[2] || 'admin@oslaboris.com';
  const password = process.argv[3] || 'admin123';
  const name = 'Super Admin';

  // Verificar se já existe
  const existing = await db('users').where({ email }).first();
  if (existing) {
    console.log(`⚠️  Usuário ${email} já existe.`);
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [user] = await db('users')
    .insert({
      name,
      email,
      password_hash,
      role: 'super_admin',
      tenant_id: null,
    })
    .returning('*');

  console.log('✅ Super Admin criado!');
  console.log(`   Email: ${email}`);
  console.log(`   Senha: ${password}`);
  console.log(`   ID: ${user.id}`);
  process.exit(0);
}

createSuperAdmin().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
