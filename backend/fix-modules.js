require('dotenv').config();
const db = require('./src/database/connection');

async function fix() {
  // Atualiza todos os tenants existentes pra ter todos os módulos
  await db('tenants').update({ modules: JSON.stringify(['os', 'financeiro']) });
  console.log('✅ Todos os tenants atualizados com módulos: os, financeiro');
  process.exit(0);
}

fix().catch((e) => { console.error(e); process.exit(1); });
