#!/usr/bin/env node

/**
 * Script para diagnosticar onde os dados estão sendo inseridos/lidos
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME;
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH;
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function diagnose() {
  console.log('🔍 Diagnosticando tb_health_scrappers...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();
    
    // 1. Verificar catálogo e schema atual
    console.log('1️⃣ Contexto atual:');
    const contextOp = await session.executeStatement('SELECT current_catalog(), current_database()');
    const context = await contextOp.fetchAll();
    await contextOp.close();
    console.log(`   Catalog: ${context[0]['current_catalog()']}`);
    console.log(`   Database: ${context[0]['current_database()']}\n`);
    
    // 2. Verificar em diferentes localizações
    const locations = [
      'tb_health_scrappers',
      'default.tb_health_scrappers',
      'data_workspace.default.tb_health_scrappers'
    ];
    
    for (const location of locations) {
      try {
        console.log(`2️⃣ Consultando: ${location}`);
        const countOp = await session.executeStatement(`SELECT COUNT(*) as total FROM ${location}`);
        const result = await countOp.fetchAll();
        await countOp.close();
        console.log(`   ✅ Total: ${result[0]?.total || 0}\n`);
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`);
      }
    }
    
    // 3. Mostrar todas as tabelas que contêm "health"
    console.log('3️⃣ Tabelas com "health" no nome:');
    const tablesOp = await session.executeStatement(`
      SHOW TABLES IN data_workspace.default LIKE '*health*'
    `);
    const tables = await tablesOp.fetchAll();
    await tablesOp.close();
    
    if (tables.length === 0) {
      console.log('   ❌ Nenhuma tabela encontrada\n');
    } else {
      tables.forEach(t => {
        console.log(`   ✅ ${t.database}.${t.tableName}`);
      });
      console.log('');
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
diagnose()
  .then(() => {
    console.log('✅ Diagnóstico concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha:', error.message);
    process.exit(1);
  });
