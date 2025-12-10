#!/usr/bin/env node

/**
 * Script para verificar a estrutura da tabela tb_normas_consolidadas
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function checkStructure() {
  console.log('🔍 Verificando estrutura da tb_normas_consolidadas...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();
    
    // Usar o catálogo correto
    await session.executeStatement('USE CATALOG data_workspace');
    await session.executeStatement('USE SCHEMA unificado');

    // Descrever a tabela
    console.log('📋 Estrutura da tabela:\n');
    const descOp = await session.executeStatement('DESCRIBE data_workspace.unificado.tb_normas_consolidadas');
    const columns = await descOp.fetchAll();
    await descOp.close();

    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.col_name} (${col.data_type})`);
    });

    // Buscar um registro de exemplo
    console.log('\n\n📊 Exemplo de registro:\n');
    const sampleOp = await session.executeStatement(`
      SELECT * FROM data_workspace.unificado.tb_normas_consolidadas 
      WHERE origem_dado IS NOT NULL 
        AND origem_publicacao IS NOT NULL
      LIMIT 1
    `);
    const sample = await sampleOp.fetchAll();
    await sampleOp.close();

    if (sample.length > 0) {
      const record = sample[0];
      Object.keys(record).forEach(key => {
        console.log(`${key}: ${record[key]}`);
      });
    }

    // Verificar colunas de data disponíveis
    console.log('\n\n📅 Colunas de data encontradas:\n');
    const dateColumns = columns.filter(col => 
      col.col_name.toLowerCase().includes('data') || 
      col.col_name.toLowerCase().includes('criado') || 
      col.col_name.toLowerCase().includes('atualizado') ||
      col.col_name.toLowerCase().includes('created') ||
      col.col_name.toLowerCase().includes('updated') ||
      col.col_name.toLowerCase().includes('ingestao') ||
      col.col_name.toLowerCase().includes('lake')
    );

    dateColumns.forEach(col => {
      console.log(`✅ ${col.col_name} (${col.data_type})`);
    });

    await session.close();

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
  }
}

// Executar
checkStructure()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error.message);
    process.exit(1);
  });
