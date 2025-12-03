const XLSX = require('xlsx');
const { DBSQLClient } = require('@databricks/sql');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function clearAndImportCrawlers() {
  const excelPath = path.join(__dirname, '..', '..', 'Monitoramento_Diários 1.xlsx');
  
  console.log('📖 Lendo arquivo Excel:', excelPath);
  
  // Ler arquivo Excel
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converter para JSON - começando da linha 2 (pulando o título)
  const data = XLSX.utils.sheet_to_json(worksheet, { range: 1 });
  
  console.log(`✅ Total de registros encontrados: ${data.length}`);
  
  // Conectar ao Databricks
  console.log('\n🔌 Conectando ao Databricks...');
  const client = new DBSQLClient();
  
  const connectionOptions = {
    host: process.env.DATABRICKS_SERVER_HOSTNAME,
    path: process.env.DATABRICKS_HTTP_PATH,
    token: process.env.DATABRICKS_ACCESS_TOKEN,
  };
  
  if (!connectionOptions.host || !connectionOptions.path || !connectionOptions.token) {
    console.error('❌ Credenciais do Databricks não configuradas!');
    process.exit(1);
  }
  
  const connection = await client.connect(connectionOptions);
  const session = await connection.openSession();
  
  console.log('✅ Conectado ao Databricks\n');
  
  // Limpar tabela
  console.log('🗑️  Limpando tabela tb_crawlers_manual...');
  try {
    await session.executeStatement('DELETE FROM default.tb_crawlers_manual WHERE 1=1');
    console.log('✅ Tabela limpa com sucesso\n');
  } catch (error) {
    console.error('❌ Erro ao limpar tabela:', error.message);
    await session.close();
    await connection.close();
    process.exit(1);
  }
  
  // Inserir dados em batches de 50 registros
  let inserted = 0;
  let errors = 0;
  const batchSize = 50;
  
  console.log(`📦 Processando em lotes de ${batchSize} registros...\n`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, Math.min(i + batchSize, data.length));
    const values = [];
    
    for (const row of batch) {
      // Mapear colunas do Excel para colunas do banco
      const fonte = row['Fonte'] || row['fonte'] || '';
      const periodicidade = row['Periodicidade'] || row['periodicidade'] || null;
      const pais = row['País'] || row['Pais'] || row['pais'] || null;
      const estado = row['Estado'] || row['estado'] || null;
      const cidade = row['Cidade'] || row['cidade'] || null;
      
      if (!fonte) {
        console.warn('⚠️  Pulando registro sem fonte');
        continue;
      }
      
      // Tratar valores especiais
      const cidadeValue = (cidade && cidade !== 'N/A') ? `'${String(cidade).replace(/'/g, "''")}'` : 'NULL';
      const periodicidadeValue = periodicidade ? `'${String(periodicidade)}'` : 'NULL';
      
      values.push(`(
        '${fonte.replace(/'/g, "''")}',
        ${periodicidadeValue},
        ${pais ? `'${String(pais).replace(/'/g, "''")}'` : 'NULL'},
        ${estado ? `'${String(estado).replace(/'/g, "''")}'` : 'NULL'},
        ${cidadeValue},
        0,
        NULL,
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP(),
        true
      )`);
    }
    
    if (values.length === 0) continue;
    
    try {
      const sql = `
        INSERT INTO default.tb_crawlers_manual 
        (fonte, periodicidade, pais, estado, cidade, prioridade, usuario_id, data_criacao, data_atualizacao, ativo)
        VALUES ${values.join(',\n')}
      `;
      
      await session.executeStatement(sql);
      inserted += values.length;
      console.log(`📥 Inseridos: ${inserted}/${data.length}`);
    } catch (error) {
      errors += values.length;
      console.error(`❌ Erro ao inserir lote de ${values.length} registros:`);
      console.error(`   ${error.message}`);
    }
  }
  
  await session.close();
  await connection.close();
  
  console.log('\n✅ Importação concluída!');
  console.log(`   📊 Total de registros no Excel: ${data.length}`);
  console.log(`   ✅ Inseridos com sucesso: ${inserted}`);
  console.log(`   ❌ Erros: ${errors}`);
}

// Executar
clearAndImportCrawlers()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
