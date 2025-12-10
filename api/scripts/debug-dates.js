#!/usr/bin/env node

/**
 * Debug: Verificar as datas que estão vindo da query
 */

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME;
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH;
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function debugDates() {
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

    const query = `
      SELECT 
        CONCAT(COALESCE(origem_dado, 'unknown'), '_', COALESCE(origem_publicacao, 'unknown')) as service,
        origem_dado,
        COUNT(*) as total_registros,
        MIN(criado_em) as primeira_criado,
        MAX(atualizado_em) as ultima_atualizado,
        MIN(lake_ingestao) as primeira_ingestao,
        MAX(lake_ingestao) as ultima_ingestao
      FROM data_workspace.unificado.tb_normas_consolidadas
      WHERE origem_dado IS NOT NULL 
        AND origem_publicacao IS NOT NULL
      GROUP BY origem_dado, origem_publicacao
      ORDER BY total_registros DESC
      LIMIT 3
    `;

    console.log('🔍 Consultando datas...\n');
    const op = await session.executeStatement(query);
    const results = await op.fetchAll();
    await op.close();

    results.forEach((row, i) => {
      console.log(`${i + 1}. ${row.service}`);
      console.log(`   Total: ${row.total_registros}`);
      console.log(`   criado_em (primeira): ${row.primeira_criado}`);
      console.log(`   atualizado_em (última): ${row.ultima_atualizado}`);
      console.log(`   lake_ingestao (primeira): ${row.primeira_ingestao}`);
      console.log(`   lake_ingestao (última): ${row.ultima_ingestao}`);
      
      if (row.primeira_ingestao) {
        const date = new Date(row.primeira_ingestao);
        console.log(`   ✅ Data ingestao convertida: ${date.toISOString()}`);
      }
      console.log('');
    });

    await session.close();
  } finally {
    await connection.close();
  }
}

debugDates()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
