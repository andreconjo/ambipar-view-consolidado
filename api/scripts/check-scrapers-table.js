#!/usr/bin/env node

/**
 * Script para verificar e forçar refresh da tabela tb_health_scrappers
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function checkAndRefreshTable() {
  console.log('🔍 Verificando tabela no Azure Databricks...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();

    // Verificar catálogo e schema atual
    console.log('📍 Verificando contexto atual:');
    const catalogOp = await session.executeStatement('SELECT current_catalog(), current_database()');
    const catalogResult = await catalogOp.fetchAll();
    await catalogOp.close();
    console.log(`   Catalog: ${catalogResult[0]['current_catalog()']}`);
    console.log(`   Database: ${catalogResult[0]['current_database()']}\n`);
    
    // Listar todas as tabelas no schema
    console.log('📋 Listando tabelas em data_workspace.default:');
    const showOp = await session.executeStatement('SHOW TABLES IN data_workspace.default');
    const tables = await showOp.fetchAll();
    await showOp.close();

    console.log(`\nTotal de tabelas: ${tables.length}`);
    tables.forEach(table => {
      const marker = table.tableName === 'tb_health_scrappers' ? '✅' : '  ';
      console.log(`${marker} ${table.namespace}.${table.tableName}`);
    });

    const healthTable = tables.find(t => t.tableName === 'tb_health_scrappers');
    
    if (healthTable) {
      console.log('\n✅ Tabela tb_health_scrappers encontrada!');
      
      // Forçar refresh
      console.log('\n🔄 Forçando REFRESH TABLE...');
      await session.executeStatement('REFRESH TABLE data_workspace.default.tb_health_scrappers');
      console.log('✅ REFRESH executado com sucesso');
      
      // Testar SELECT
      console.log('\n🧪 Testando SELECT COUNT(*)...');
      const countOp = await session.executeStatement('SELECT COUNT(*) as total FROM data_workspace.default.tb_health_scrappers');
      const result = await countOp.fetchAll();
      await countOp.close();
      console.log(`✅ Query executada: ${result[0].total} registros`);
      
    } else {
      console.log('\n⚠️ Tabela tb_health_scrappers NÃO encontrada!');
      console.log('Criando a tabela...\n');
      
      // Definir catálogo e schema explicitamente
      await session.executeStatement('USE CATALOG data_workspace');
      await session.executeStatement('USE SCHEMA default');
      console.log('✅ Contexto definido: data_workspace.default');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS tb_health_scrappers (
          id BIGINT GENERATED ALWAYS AS IDENTITY,
          service STRING NOT NULL,
          total_registros BIGINT,
          execution_time BIGINT,
          state STRING,
          status STRING,
          error_message STRING,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        ) USING DELTA
      `;
      
      await session.executeStatement(createTableSQL);
      console.log('✅ Tabela criada');
      
      // Aguardar propagação
      console.log('\n⏳ Aguardando propagação (15 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Verificar novamente
      const checkOp = await session.executeStatement('SHOW TABLES LIKE \'tb_health_scrappers\'');
      const checkResult = await checkOp.fetchAll();
      await checkOp.close();
      
      if (checkResult.length > 0) {
        console.log('✅ Tabela confirmada após propagação!');
      } else {
        console.log('⚠️ Tabela ainda não visível (pode levar mais tempo)');
      }
    }

    await session.close();
    console.log('\n✅ Processo concluído! Reinicie o NestJS para aplicar mudanças.');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

checkAndRefreshTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Falha:', error);
    process.exit(1);
  });
