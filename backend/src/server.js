require('dotenv').config();
const app = require('./app');
const db = require('./database/connection');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Log do ambiente
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    
    // Executar migrations antes de iniciar
    console.log('🔄 Executando migrations...');
    const [batchNo, log] = await db.migrate.latest();
    if (log.length === 0) {
      console.log('✅ Banco já está atualizado, nenhuma migration pendente');
    } else {
      console.log(`✅ Batch ${batchNo} executado: ${log.length} migrations`);
      log.forEach(m => console.log(`   - ${m}`));
    }
    
    // Verificar se coluna deposit_amount existe
    const hasColumn = await db.schema.hasColumn('service_orders', 'deposit_amount');
    console.log(`💰 Coluna deposit_amount existe: ${hasColumn}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📋 API disponível em http://localhost:${PORT}/api/v1`);
      console.log(`📅 Deploy: ${new Date().toISOString()}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
