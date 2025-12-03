const { DBSQLClient } = require('@databricks/sql');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function verifyCrawlers() {
  console.log('🔌 Conectando ao Databricks...');
  const client = new DBSQLClient();
  
  const connectionOptions = {
    host: process.env.DATABRICKS_SERVER_HOSTNAME,
    path: process.env.DATABRICKS_HTTP_PATH,
    token: process.env.DATABRICKS_ACCESS_TOKEN,
  };
  
  const connection = await client.connect(connectionOptions);
  const session = await connection.openSession();
  
  console.log('✅ Conectado\n');
  
  // Total de registros
  const countQuery = 'SELECT COUNT(*) as total FROM default.tb_crawlers_manual';
  const countResult = await session.executeStatement(countQuery);
  const countRows = await countResult.fetchAll();
  console.log(`📊 Total de crawlers: ${countRows[0].total}\n`);
  
  // Exemplos de registros
  const sampleQuery = 'SELECT * FROM default.tb_crawlers_manual LIMIT 5';
  const sampleResult = await session.executeStatement(sampleQuery);
  const sampleRows = await sampleResult.fetchAll();
  
  console.log('🔍 Primeiros 5 registros:');
  sampleRows.forEach((row, i) => {
    console.log(`\n${i + 1}. ${row.fonte}`);
    console.log(`   Periodicidade: ${row.periodicidade}`);
    console.log(`   País: ${row.pais}`);
    console.log(`   Estado: ${row.estado}`);
    console.log(`   Cidade: ${row.cidade}`);
    console.log(`   Prioridade: ${row.prioridade}`);
    console.log(`   Ativo: ${row.ativo}`);
  });
  
  // Agregações
  console.log('\n📈 Estatísticas:');
  
  const paisQuery = 'SELECT pais, COUNT(*) as total FROM default.tb_crawlers_manual GROUP BY pais ORDER BY total DESC';
  const paisResult = await session.executeStatement(paisQuery);
  const paisRows = await paisResult.fetchAll();
  console.log('\n  Por País:');
  paisRows.forEach(row => console.log(`    ${row.pais}: ${row.total}`));
  
  const estadoQuery = 'SELECT estado, COUNT(*) as total FROM default.tb_crawlers_manual WHERE pais = \'Brasil\' GROUP BY estado ORDER BY total DESC LIMIT 10';
  const estadoResult = await session.executeStatement(estadoQuery);
  const estadoRows = await estadoResult.fetchAll();
  console.log('\n  Top 10 Estados (Brasil):');
  estadoRows.forEach(row => console.log(`    ${row.estado}: ${row.total}`));
  
  await session.close();
  await connection.close();
  
  console.log('\n✨ Verificação concluída!');
}

verifyCrawlers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
