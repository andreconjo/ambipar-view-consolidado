#!/usr/bin/env node

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function addAplicavelColumnDelta() {
  console.log('🔧 Adicionando coluna aplicavel usando sintaxe Delta Lake...\n');

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

    console.log('📍 Contexto: data_workspace.unificado\n');

    // Verificar se coluna existe
    const describeResult = await session.executeStatement(
      'DESCRIBE TABLE tb_normas_consolidadas'
    );
    const columns = await describeResult.fetchAll();
    await describeResult.close();

    const columnNames = columns.map(row => row.col_name);
    const hasAplicavel = columnNames.includes('aplicavel');

    if (hasAplicavel) {
      console.log('✅ Coluna aplicavel já existe!');
    } else {
      console.log('❌ Coluna aplicavel não existe. Adicionando...\n');

      // Sintaxe Delta Lake para ADD COLUMN
      try {
        console.log('🔄 Executando: ALTER TABLE ADD COLUMNS...');
        const alterResult = await session.executeStatement(
          'ALTER TABLE tb_normas_consolidadas ADD COLUMNS (aplicavel BOOLEAN)'
        );
        await alterResult.close();
        console.log('✅ Comando ALTER TABLE executado\n');

        // Aguardar propagação
        console.log('⏳ Aguardando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Refresh
        console.log('🔄 Executando REFRESH TABLE...');
        await session.executeStatement('REFRESH TABLE tb_normas_consolidadas');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar novamente
        console.log('🔍 Verificando se coluna foi adicionada...');
        const verifyResult = await session.executeStatement(
          'DESCRIBE TABLE tb_normas_consolidadas'
        );
        const updatedColumns = await verifyResult.fetchAll();
        await verifyResult.close();

        const updatedNames = updatedColumns.map(row => row.col_name);
        if (updatedNames.includes('aplicavel')) {
          console.log('✅ Coluna aplicavel adicionada com sucesso!\n');
          
          // Definir valores default
          console.log('🔄 Definindo valor padrão false para registros existentes...');
          const updateResult = await session.executeStatement(
            'UPDATE tb_normas_consolidadas SET aplicavel = false WHERE aplicavel IS NULL'
          );
          await updateResult.close();
          console.log('✅ Valores padrão definidos\n');
        } else {
          console.log('❌ Coluna ainda não está visível após ALTER TABLE\n');
          console.log('Últimas 10 colunas:', updatedNames.slice(-10));
        }

      } catch (error) {
        console.error('❌ Erro ao executar ALTER TABLE:', error.message);
        throw error;
      }
    }

    // Teste final
    console.log('\n🧪 Testando query com aplicavel...');
    try {
      const testResult = await session.executeStatement(
        'SELECT COUNT(*) as total FROM tb_normas_consolidadas WHERE aplicavel = true'
      );
      const testData = await testResult.fetchAll();
      await testResult.close();
      console.log(`✅ Query OK: ${testData[0].total} normas aplicáveis\n`);
    } catch (error) {
      console.log(`❌ Query falhou: ${error.message}\n`);
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

addAplicavelColumnDelta()
  .then(() => {
    console.log('🎉 Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error);
    process.exit(1);
  });
