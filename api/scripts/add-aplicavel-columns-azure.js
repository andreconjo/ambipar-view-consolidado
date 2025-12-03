#!/usr/bin/env node

/**
 * Script para adicionar colunas 'aplicavel' e 'sistema_gestao' na tabela Azure
 * tb_normas_consolidadas para manter compatibilidade com o comportamento do Flask
 */

const { DBSQLClient } = require('@databricks/sql');

// Variáveis de ambiente (configure no sistema ou substitua diretamente aqui)
const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

const AZURE_CONFIG = {
  host: DATABRICKS_HOST,
  path: DATABRICKS_PATH,
  token: DATABRICKS_TOKEN,
  catalog: 'data_workspace',
  schema: 'unificado',
};

async function addAplicavelColumns() {
  console.log('🔧 Iniciando migração de colunas aplicavel e sistema_gestao...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: AZURE_CONFIG.host,
    path: AZURE_CONFIG.path,
    token: AZURE_CONFIG.token,
  });

  try {
    const session = await connection.openSession();

    // 1. Verificar catálogo e schema atuais
    console.log('📍 Verificando contexto atual...');
    const catalogResult = await session.executeStatement('SELECT current_catalog()');
    await catalogResult.fetchAll();
    await catalogResult.close();

    const schemaResult = await session.executeStatement('SELECT current_schema()');
    await schemaResult.fetchAll();
    await schemaResult.close();

    // 2. Usar o catálogo e schema corretos
    console.log(`📂 Usando catálogo: ${AZURE_CONFIG.catalog}, schema: ${AZURE_CONFIG.schema}`);
    await session.executeStatement(`USE CATALOG ${AZURE_CONFIG.catalog}`);
    await session.executeStatement(`USE SCHEMA ${AZURE_CONFIG.schema}`);

    // 3. Verificar se as colunas já existem
    console.log('\n🔍 Verificando se as colunas já existem...');
    const describeResult = await session.executeStatement(
      'DESCRIBE TABLE tb_normas_consolidadas'
    );
    const columns = await describeResult.fetchAll();
    await describeResult.close();

    const columnNames = columns.map(row => row.col_name);
    const hasAplicavel = columnNames.includes('aplicavel');
    const hasSistemaGestao = columnNames.includes('sistema_gestao');

    console.log(`   aplicavel: ${hasAplicavel ? '✅ Já existe' : '❌ Não existe'}`);
    console.log(`   sistema_gestao: ${hasSistemaGestao ? '✅ Já existe' : '❌ Não existe'}`);

    // 4. Adicionar coluna 'aplicavel' se não existir
    if (!hasAplicavel) {
      console.log('\n➕ Adicionando coluna aplicavel...');
      await session.executeStatement(
        'ALTER TABLE tb_normas_consolidadas ADD COLUMN aplicavel BOOLEAN DEFAULT false'
      );
      console.log('   ✅ Coluna aplicavel adicionada com sucesso');
      
      // Forçar refresh do cache de metadados
      console.log('   🔄 Forçando refresh do schema...');
      await session.executeStatement('REFRESH TABLE tb_normas_consolidadas');
      
      // Aguardar propagação (Delta Lake transaction log)
      console.log('   ⏳ Aguardando 5 segundos para propagação do schema...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 5. Adicionar coluna 'sistema_gestao' se não existir
    if (!hasSistemaGestao) {
      console.log('\n➕ Adicionando coluna sistema_gestao...');
      await session.executeStatement(
        'ALTER TABLE tb_normas_consolidadas ADD COLUMN sistema_gestao STRING'
      );
      console.log('   ✅ Coluna sistema_gestao adicionada com sucesso');
      
      // Forçar refresh do cache de metadados
      console.log('   🔄 Forçando refresh do schema...');
      await session.executeStatement('REFRESH TABLE tb_normas_consolidadas');
      
      // Aguardar propagação
      console.log('   ⏳ Aguardando 5 segundos para propagação do schema...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 6. Verificar colunas após migração com refresh forçado
    if (!hasAplicavel || !hasSistemaGestao) {
      console.log('\n🔍 Verificando estrutura após migração...');
      
      // Refresh final antes de verificar
      await session.executeStatement('REFRESH TABLE tb_normas_consolidadas');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const verifyResult = await session.executeStatement(
        'DESCRIBE TABLE tb_normas_consolidadas'
      );
      const updatedColumns = await verifyResult.fetchAll();
      await verifyResult.close();

      const updatedColumnNames = updatedColumns.map(row => row.col_name);
      console.log(`   aplicavel: ${updatedColumnNames.includes('aplicavel') ? '✅' : '❌'}`);
      console.log(`   sistema_gestao: ${updatedColumnNames.includes('sistema_gestao') ? '✅' : '❌'}`);
      
      // Mostrar todas as colunas para debug
      if (!updatedColumnNames.includes('aplicavel')) {
        console.log('\n⚠️  Coluna aplicavel ainda não visível. Colunas atuais:');
        console.log('   ', updatedColumnNames.slice(-10).join(', '));
      }
    }

    // 7. Contar registros atuais
    console.log('\n📊 Estatísticas da tabela:');
    const countResult = await session.executeStatement(
      'SELECT COUNT(*) as total FROM tb_normas_consolidadas'
    );
    const countData = await countResult.fetchAll();
    await countResult.close();
    console.log(`   Total de normas: ${countData[0].total}`);

    if (hasAplicavel) {
      const aplicaveisResult = await session.executeStatement(
        'SELECT COUNT(*) as total FROM tb_normas_consolidadas WHERE aplicavel = true'
      );
      const aplicaveisData = await aplicaveisResult.fetchAll();
      await aplicaveisResult.close();
      console.log(`   Normas aplicáveis: ${aplicaveisData[0].total}`);
    }

    await session.close();

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Execute POST /normas/sync-aplicavel para sincronizar as classificações');
    console.log('   2. Verifique as normas aplicáveis em GET /normas?aplicavel=true');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

// Executar
addAplicavelColumns()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na execução:', error);
    process.exit(1);
  });
