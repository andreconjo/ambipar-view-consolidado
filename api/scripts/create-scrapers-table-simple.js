#!/usr/bin/env node

/**
 * Script simplificado para criar tabela tb_health_scrappers
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function createTable() {
  console.log('🔧 Criando tabela no Azure Databricks...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();

    console.log('📍 Criando tabela data_workspace.default.tb_health_scrappers...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS data_workspace.default.tb_health_scrappers (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        service STRING NOT NULL,
        total_registros BIGINT,
        execution_time BIGINT COMMENT 'Tempo de execução em segundos',
        state STRING COMMENT 'Estado/UF',
        status STRING COMMENT 'success, error, running',
        error_message STRING,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
      ) USING DELTA
      COMMENT 'Tabela para monitoramento de scrapers'
    `;

    await session.executeStatement(createTableSQL);
    console.log('✅ Tabela criada com sucesso!\n');

    // Verificar se a tabela existe
    console.log('🔍 Verificando tabela...');
    const showOp = await session.executeStatement(`SHOW TABLES IN data_workspace.default LIKE 'tb_health_scrappers'`);
    const tables = await showOp.fetchAll();
    await showOp.close();

    if (tables.length > 0) {
      console.log(`✅ Tabela ${tables[0].tableName} encontrada no schema ${tables[0].namespace}`);
    } else {
      console.log('⚠️ Tabela não encontrada imediatamente (pode levar alguns segundos)');
    }

    await session.close();
    console.log('\n✅ Processo concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

createTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Falha:', error);
    process.exit(1);
  });
