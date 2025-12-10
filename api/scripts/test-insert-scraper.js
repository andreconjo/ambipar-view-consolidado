#!/usr/bin/env node

/**
 * Script para inserir um único registro de teste
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME;
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH;
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function testInsert() {
  console.log('🧪 Testando inserção simples...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();
    
    // Inserir um registro de teste
    const insertQuery = `
      INSERT INTO data_workspace.default.tb_health_scrappers 
      (service, total_registros, execution_time, state, status, error_message, created_at, updated_at)
      VALUES (
        'test_scraper',
        100,
        30,
        'TEST',
        'success',
        NULL,
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP()
      )
    `;
    
    console.log('📝 Inserindo registro de teste...');
    const insertOp = await session.executeStatement(insertQuery);
    await insertOp.close();
    console.log('✅ Insert executado\n');
    
    // Aguardar
    console.log('⏳ Aguardando 2 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Consultar
    console.log('🔍 Consultando...');
    const selectOp = await session.executeStatement('SELECT * FROM data_workspace.default.tb_health_scrappers WHERE service = \'test_scraper\'');
    const result = await selectOp.fetchAll();
    await selectOp.close();
    
    console.log(`\nResultado: ${result.length} registro(s) encontrado(s)`);
    if (result.length > 0) {
      console.log(JSON.stringify(result[0], null, 2));
    }

    await session.close();

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
  }
}

// Executar
testInsert()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error.message);
    process.exit(1);
  });
