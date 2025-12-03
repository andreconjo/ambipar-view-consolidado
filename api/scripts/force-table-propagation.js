const { DBSQLClient } = require('@databricks/sql');

async function forceRefresh() {
  console.log('🔄 Forçando propagação da tabela...\n');

  const client = new DBSQLClient();

  try {
    await client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_ACCESS_TOKEN,
    });

    const session = await client.openSession();

    // Verificar se tabela já existe
    console.log('📋 Verificando se tabela existe...');
    const showTables = await session.executeStatement(
      "SHOW TABLES IN default LIKE 'tb_health_scrappers'",
      { runAsync: true, maxRows: 10 }
    );
    const existingTables = await showTables.fetchAll();
    await showTables.close();

    if (existingTables.length > 0) {
      console.log('✅ Tabela default.tb_health_scrappers já existe!');
    } else {
      console.log('📝 Criando tabela default.tb_health_scrappers...');
      
      await session.executeStatement(`
        CREATE TABLE default.tb_health_scrappers (
          id BIGINT GENERATED ALWAYS AS IDENTITY,
          service STRING NOT NULL,
          total_registros STRING,
          execution_time STRING,
          state STRING,
          status STRING NOT NULL,
          error_message STRING,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        )
        USING DELTA
        COMMENT 'Tabela de saúde e monitoramento dos scrapers'
      `, { runAsync: true });
      
      console.log('✅ Tabela criada com sucesso!');
      
      console.log('\n⏳ Aguardando propagação (5 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Verificar novamente
    console.log('\n🔍 Verificação final...');
    const finalCheck = await session.executeStatement(
      "SHOW TABLES IN default",
      { runAsync: true, maxRows: 100 }
    );
    const allTables = await finalCheck.fetchAll();
    await finalCheck.close();

    const scraperTable = allTables.find(t => t.tableName === 'tb_health_scrappers');
    if (scraperTable) {
      console.log('✅ Tabela tb_health_scrappers está visível!');
      console.log('\n🎉 Sucesso! A tabela está pronta para uso.');
    } else {
      console.log('⚠️ Tabela ainda não aparece em SHOW TABLES');
      console.log('Tabelas encontradas:', allTables.map(t => t.tableName).join(', '));
    }

    await session.close();
    await client.close();

    console.log('\n✅ Processo concluído! Tente recarregar a página do frontend.');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

forceRefresh();
