#!/usr/bin/env node

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura completa da tabela tb_normas_consolidadas...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();

    await session.executeStatement('USE CATALOG data_workspace');
    await session.executeStatement('USE SCHEMA unificado');

    // Refresh antes de verificar
    await session.executeStatement('REFRESH TABLE tb_normas_consolidadas');

    // Buscar todas as colunas
    const describeResult = await session.executeStatement(
      'DESCRIBE TABLE tb_normas_consolidadas'
    );
    const columns = await describeResult.fetchAll();
    await describeResult.close();

    console.log('📋 Estrutura da tabela (total de colunas:', columns.length, '):\n');
    
    columns.forEach((col, index) => {
      const num = String(index + 1).padStart(3, ' ');
      const name = col.col_name.padEnd(30, ' ');
      const type = col.data_type;
      console.log(`${num}. ${name} ${type}`);
    });

    // Verificar colunas específicas
    const columnNames = columns.map(row => row.col_name);
    console.log('\n🔎 Verificação de colunas específicas:');
    console.log(`   aplicavel:           ${columnNames.includes('aplicavel') ? '✅' : '❌'}`);
    console.log(`   sistema_gestao:      ${columnNames.includes('sistema_gestao') ? '✅' : '❌'}`);
    console.log(`   sistema_de_gestao:   ${columnNames.includes('sistema_de_gestao') ? '✅' : '❌'}`);

    // Testar query com aplicavel
    console.log('\n🧪 Testando query com coluna aplicavel...');
    try {
      const testResult = await session.executeStatement(
        'SELECT COUNT(*) as total FROM tb_normas_consolidadas WHERE aplicavel = true'
      );
      const testData = await testResult.fetchAll();
      await testResult.close();
      console.log(`   ✅ Query executada com sucesso: ${testData[0].total} normas aplicáveis`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

    await session.close();

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

checkTableStructure()
  .then(() => {
    console.log('\n✅ Verificação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error);
    process.exit(1);
  });
