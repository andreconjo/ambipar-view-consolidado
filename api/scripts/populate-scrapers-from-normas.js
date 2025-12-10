#!/usr/bin/env node

/**
 * Script para popular tb_health_scrappers usando dados reais de tb_normas_consolidadas
 * origem_dado + origem_publicacao = nome do scraper
 * created_at = data do dado
 * updated_at = ultima execução
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function populateFromNormas() {
  console.log('🔄 Populando tb_health_scrappers a partir de tb_normas_consolidadas...\n');

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

    console.log('📊 Analisando scrapers na tb_normas_consolidadas...\n');

    // Buscar execuções por scraper agrupadas por dia (últimos 30 dias)
    // Isso cria múltiplos registros de health check, um por dia de execução
    const query = `
      SELECT 
        CONCAT(COALESCE(origem_dado, 'unknown'), '_', COALESCE(origem_publicacao, 'unknown')) as service,
        origem_dado as state,
        DATE(lake_ingestao) as execution_date,
        COUNT(*) as total_registros
      FROM data_workspace.unificado.tb_normas_consolidadas
      WHERE origem_dado IS NOT NULL 
        AND origem_publicacao IS NOT NULL
        AND lake_ingestao IS NOT NULL
        AND lake_ingestao >= CURRENT_DATE() - INTERVAL 30 DAYS
      GROUP BY origem_dado, origem_publicacao, DATE(lake_ingestao)
      ORDER BY execution_date DESC, total_registros DESC
    `;

    console.log('🔍 Executando query de agregação (últimos 30 dias)...');
    const aggOp = await session.executeStatement(query);
    const executions = await aggOp.fetchAll();
    await aggOp.close();

    console.log(`\n✅ Encontradas ${executions.length} execuções de scrapers\n`);

    // Limpar tabela tb_health_scrappers antes de popular
    console.log('🧹 Limpando tabela tb_health_scrappers...');
    await session.executeStatement('USE CATALOG data_workspace');
    await session.executeStatement('USE SCHEMA default');
    await session.executeStatement('DELETE FROM data_workspace.default.tb_health_scrappers WHERE 1=1');
    console.log('✅ Tabela limpa\n');

    // Inserir um registro para cada execução (scraper + dia)
    console.log('📝 Inserindo registros de health checks...\n');
    let inserted = 0;

    for (const execution of executions) {
      const serviceName = execution.service;
      const state = execution.state || 'N/A';
      const totalRegistros = Number(execution.total_registros);
      const executionDate = execution.execution_date;
      
      // Calcular tempo de execução estimado (baseado na quantidade de registros)
      // ~1-5 segundos por cada 100 registros
      const executionTime = Math.max(10, Math.min(300, Math.floor(totalRegistros / 100) * 3));
      
      // Status: success (assumindo que dados existem = scraper funcionou)
      const status = 'success';

      // Converter data de execução para timestamp
      const executionTimestamp = executionDate ? new Date(executionDate).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '') : null;

      const insertQuery = `
        INSERT INTO data_workspace.default.tb_health_scrappers 
        (service, total_registros, execution_time, state, status, error_message, created_at, updated_at)
        VALUES (
          '${serviceName}',
          ${totalRegistros},
          ${executionTime},
          '${state}',
          '${status}',
          NULL,
          ${executionTimestamp ? `'${executionTimestamp}'` : 'CURRENT_TIMESTAMP()'},
          ${executionTimestamp ? `'${executionTimestamp}'` : 'CURRENT_TIMESTAMP()'}
        )
      `;

      try {
        const insertOp = await session.executeStatement(insertQuery);
        await insertOp.close();
        inserted++;
        if (inserted % 10 === 0 || inserted <= 5) {
          console.log(`   ✅ [${inserted}/${executions.length}] ${serviceName} (${executionDate}) - ${totalRegistros} registros`);
        }
      } catch (error) {
        console.error(`   ❌ Erro ao inserir ${serviceName}: ${error.message}`);
      }
    }

    // Aguardar um pouco para garantir que os dados foram persistidos
    console.log('\n⏳ Aguardando persistência dos dados...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar resultado
    console.log('\n📊 Verificando dados inseridos...');
    const countOp = await session.executeStatement('SELECT COUNT(*) as total FROM data_workspace.default.tb_health_scrappers');
    const countResult = await countOp.fetchAll();
    await countOp.close();

    const total = countResult[0]?.total || 0;
    console.log(`\n✅ Total de registros em tb_health_scrappers: ${total}`);

    // Mostrar alguns exemplos recentes
    console.log('\n📋 Exemplos de registros inseridos (mais recentes):');
    const sampleOp = await session.executeStatement(`
      SELECT service, total_registros, execution_time, state, status, DATE(updated_at) as execution_date
      FROM data_workspace.default.tb_health_scrappers
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    const samples = await sampleOp.fetchAll();
    await sampleOp.close();

    samples.forEach((sample, index) => {
      console.log(`${index + 1}. ${sample.service} - ${sample.execution_date} (${sample.total_registros} registros, ${sample.execution_time}s)`);
    });
    
    console.log(`\n✅ População concluída!`);
    console.log(`   Total de execuções inseridas: ${inserted}`);
    console.log(`   Período: Últimos 30 dias`);

    await session.close();
    console.log('\n✅ Processo concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('💥 Stack:', error.stack);
    throw error;
  } finally {
    await connection.close();
  }
}

// Executar
populateFromNormas()
  .then(() => {
    console.log('\n🎉 Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error.message);
    process.exit(1);
  });
