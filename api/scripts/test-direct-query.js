const { DBSQLClient } = require('@databricks/sql');

async function directQuery() {
  console.log('🔍 Testando query direta na tabela...\n');

  const client = new DBSQLClient();

  try {
    await client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_ACCESS_TOKEN,
    });

    const session = await client.openSession();

    // Tentar SELECT direto
    console.log('📊 Executando SELECT COUNT(*) ...');
    try {
      const op = await session.executeStatement(
        'SELECT COUNT(*) as total FROM data_workspace.default.tb_health_scrappers',
        { runAsync: true, maxRows: 10 }
      );
      const result = await op.fetchAll();
      await op.close();
      
      console.log('✅ Query executada com sucesso!');
      console.log('📈 Resultado:', result);
      console.log('\n🎉 A tabela EXISTE e está acessível!');
    } catch (error) {
      console.log('❌ Erro na query:', error.message);
      console.log('\n⚠️ A tabela pode não estar completamente propagada ainda.');
    }

    await session.close();
    await client.close();
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    process.exit(1);
  }
}

directQuery();
