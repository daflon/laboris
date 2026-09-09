require('dotenv').config();
const app = require('./app');
const db = require('./database/connection');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Executar migrations antes de iniciar
    console.log('🔄 Executando migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations executadas com sucesso!');
    
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
