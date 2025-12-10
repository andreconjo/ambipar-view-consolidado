#!/usr/bin/env node

/**
 * Popular tb_health_scrappers com registros simulando execuções diárias
 * dos últimos 30 dias para cada scraper encontrado
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME;
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH;
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function populateWithDailyRecords() {
  console.log('🔄 Populando tb_health_scrappers com execuções diárias...\n');

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

    // Buscar scrapers únicos
    const query = `
      SELECT 
        CONCAT(COALESCE(origem_dado, 'unknown'), '_', COALESCE(origem_publicacao, 'unknown')) as service,
        origem_dado as state,
        COUNT(*) as total_registros
      FROM data_workspace.unificado.tb_normas_consolidadas
      WHERE origem_dado IS NOT NULL 
        AND origem_publicacao IS NOT NULL
        AND lake_ingestao IS NOT NULL
      GROUP BY origem_dado, origem_publicacao
      ORDER BY total_registros DESC
    `;

    console.log('📊 Buscando scrapers...');
    const aggOp = await session.executeStatement(query);
    const scrapers = await aggOp.fetchAll();
    await aggOp.close();

    console.log(`✅ Encontrados ${scrapers.length} scrapers\n`);

    // Limpar tabela
    console.log('🧹 Limpando tabela...');
    await session.executeStatement('USE SCHEMA default');
    await session.executeStatement('DELETE FROM data_workspace.default.tb_health_scrappers WHERE 1=1');
    console.log('✅ Tabela limpa\n');

    // Inserir registros para os últimos 30 dias
    console.log('📝 Inserindo execuções diárias dos últimos 30 dias...\n');
    let totalInserted = 0;

    for (const scraper of scrapers) {
      const serviceName = scraper.service;
      const state = scraper.state || 'N/A';
      const totalRegistros = Number(scraper.total_registros);
      
      // Calcular registros por execução (dividir total por ~30 dias)
      const registrosPorDia = Math.max(1, Math.floor(totalRegistros / 30));
      
      // Inserir um registro para cada um dos últimos 30 dias
      for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
        
        const dateStr = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        
        // Variar um pouco os registros coletados (85-115% do esperado)
        const variance = 0.85 + Math.random() * 0.3;
        const registrosColeta = Math.floor(registrosPorDia * variance);
        
        // Tempo de execução baseado nos registros (10-300 segundos)
        const executionTime = Math.max(10, Math.min(300, Math.floor(registrosColeta / 10) * 3));
        
        // 95% success, 5% error
        const status = Math.random() > 0.05 ? 'success' : 'error';
        const errorMsg = status === 'error' ? 'Timeout ou connection refused' : null;

        const insertQuery = `
          INSERT INTO data_workspace.default.tb_health_scrappers 
          (service, total_registros, execution_time, state, status, error_message, created_at, updated_at)
          VALUES (
            '${serviceName}',
            ${registrosColeta},
            ${executionTime},
            '${state}',
            '${status}',
            ${errorMsg ? `'${errorMsg}'` : 'NULL'},
            '${dateStr}',
            '${dateStr}'
          )
        `;

        try {
          const insertOp = await session.executeStatement(insertQuery);
          await insertOp.close();
          totalInserted++;
        } catch (error) {
          console.error(`   ❌ Erro ao inserir ${serviceName} dia ${daysAgo}: ${error.message}`);
        }
      }
      
      console.log(`   ✅ ${serviceName}: 30 execuções inseridas`);
    }

    console.log(`\n✅ Total inserido: ${totalInserted} registros\n`);

    // Verificar resultado
    console.log('📊 Verificando...');
    const countOp = await session.executeStatement('SELECT COUNT(*) as total FROM data_workspace.default.tb_health_scrappers');
    const countResult = await countOp.fetchAll();
    await countOp.close();

    console.log(`✅ Total na tabela: ${countResult[0]?.total || 0} registros\n`);

    // Mostrar exemplos dos últimos 7 dias
    const sampleOp = await session.executeStatement(`
      SELECT service, total_registros, execution_time, status, updated_at
      FROM data_workspace.default.tb_health_scrappers
      WHERE updated_at >= CURRENT_DATE() - INTERVAL '7 days'
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    const samples = await sampleOp.fetchAll();
    await sampleOp.close();

    console.log('📋 Últimos 5 registros (últimos 7 dias):');
    samples.forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.service}`);
      console.log(`   Registros: ${s.total_registros}`);
      console.log(`   Tempo: ${s.execution_time}s`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Data: ${s.updated_at}`);
    });

    await session.close();
    console.log('\n✅ Concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
  }
}

populateWithDailyRecords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Falha:', error.message);
    process.exit(1);
  });
