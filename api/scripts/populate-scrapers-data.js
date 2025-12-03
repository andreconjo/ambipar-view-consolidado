#!/usr/bin/env node

/**
 * Script para popular dados de exemplo na tabela tb_health_scrappers
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

// Gerar dados dos últimos 15 dias
function generateMockData() {
  const services = [
    'scraper_sp_leis',
    'scraper_rj_leis',
    'scraper_mg_leis',
    'scraper_ba_leis',
    'scraper_pr_leis',
    'scraper_rs_leis',
  ];

  const states = ['SP', 'RJ', 'MG', 'BA', 'PR', 'RS'];
  const data = [];

  // Gerar execuções para os últimos 15 dias
  for (let daysAgo = 14; daysAgo >= 0; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    services.forEach((service, index) => {
      // Simular algumas falhas ocasionais (20% de chance)
      const isSuccess = Math.random() > 0.2;
      const status = isSuccess ? 'success' : 'error';
      
      // Registros aleatórios entre 500 e 3000
      const totalRegistros = isSuccess ? Math.floor(Math.random() * 2500) + 500 : 0;
      
      // Tempo de execução entre 30 e 300 segundos
      const executionTime = Math.floor(Math.random() * 270) + 30;
      
      const record = {
        service,
        state: states[index],
        status,
        total_registros: totalRegistros,
        execution_time: executionTime,
        error_message: isSuccess ? null : 'Connection timeout ou Data source unavailable',
        created_at: date.toISOString(),
      };
      
      data.push(record);
    });
  }

  return data;
}

async function populateData() {
  console.log('📊 Populando dados de exemplo na tabela tb_health_scrappers...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();
    await session.executeStatement('USE CATALOG data_workspace');
    await session.executeStatement('USE SCHEMA default');

    const mockData = generateMockData();
    console.log(`📝 Inserindo ${mockData.length} registros...\n`);

    let inserted = 0;
    for (const record of mockData) {
      const query = `
        INSERT INTO tb_health_scrappers 
        (service, total_registros, execution_time, state, status, error_message, created_at, updated_at)
        VALUES (
          '${record.service}',
          ${record.total_registros},
          ${record.execution_time},
          '${record.state}',
          '${record.status}',
          ${record.error_message ? `'${record.error_message}'` : 'NULL'},
          TIMESTAMP '${record.created_at}',
          TIMESTAMP '${record.created_at}'
        )
      `;

      await session.executeStatement(query);
      inserted++;
      
      if (inserted % 10 === 0) {
        console.log(`   ✅ ${inserted}/${mockData.length} registros inseridos`);
      }
    }

    console.log(`\n✅ Todos os ${inserted} registros foram inseridos com sucesso!`);
    console.log('\n📊 Resumo dos dados:');
    console.log(`   - Período: Últimos 15 dias`);
    console.log(`   - Serviços: ${new Set(mockData.map(r => r.service)).size}`);
    console.log(`   - Estados: ${new Set(mockData.map(r => r.state)).size}`);
    console.log(`   - Taxa de sucesso: ${((mockData.filter(r => r.status === 'success').length / mockData.length) * 100).toFixed(1)}%`);

    await session.close();

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

populateData()
  .then(() => {
    console.log('\n🎉 Script concluído!');
    console.log('\n💡 Agora você pode acessar a página de Scrapers no frontend');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error);
    process.exit(1);
  });
