#!/usr/bin/env node

/**
 * Script para criar tabela tb_health_scrappers no Azure Databricks
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function createHealthScrapersTable() {
  console.log('🔧 Criando tabela tb_health_scrappers no Azure Databricks...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();

    // Usar catálogo e schema default
    console.log('📍 Usando catálogo: data_workspace, schema: default\n');
    await session.executeStatement('USE CATALOG data_workspace');
    await session.executeStatement('USE SCHEMA default');

    // Criar tabela
    console.log('📋 Criando tabela tb_health_scrappers...');
    await session.executeStatement(`
      CREATE TABLE IF NOT EXISTS tb_health_scrappers (
        id BIGINT GENERATED ALWAYS AS IDENTITY,
        service STRING NOT NULL,
        total_registros BIGINT,
        execution_time BIGINT COMMENT 'Tempo de execução em segundos',
        state STRING COMMENT 'Estado/UF onde o scraper foi executado',
        status STRING COMMENT 'Status da execução: success, error, running',
        error_message STRING,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
      ) USING DELTA
      COMMENT 'Tabela para armazenar status de execução dos scrapers'
    `);
    console.log('✅ Tabela criada com sucesso!\n');

    // Aguardar propagação do schema (10 segundos)
    console.log('⏳ Aguardando propagação do schema (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verificar se tabela aparece no SHOW TABLES
    console.log('🔍 Verificando se tabela está visível:');
    const showResult = await session.executeStatement(
      'SHOW TABLES IN data_workspace.default'
    );
    const tables = await showResult.fetchAll();
    await showResult.close();
    
    const healthTable = tables.find(t => t.tableName === 'tb_health_scrappers');
    if (healthTable) {
      console.log(`   ✅ Tabela encontrada: ${healthTable.namespace}.${healthTable.tableName}`);
    } else {
      console.log('   ⚠️ Tabela ainda não apareceu no SHOW TABLES');
    }

    await session.close();

    console.log('\n✅ Tabela tb_health_scrappers pronta para uso!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Teste o endpoint POST /scrapers/health');
    console.log('   2. Consulte os dados em GET /scrapers/health');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

createHealthScrapersTable()
  .then(() => {
    console.log('\n🎉 Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error);
    process.exit(1);
  });
