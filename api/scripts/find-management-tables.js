#!/usr/bin/env node

const { DBSQLClient } = require('@databricks/sql');

const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME || 'adb-2981165871413987.7.azuredatabricks.net';
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/c0bbc47da86594b2';
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

async function checkManagementTables() {
  console.log('🔍 Procurando tabelas de management systems no Azure Databricks...\n');

  const client = new DBSQLClient();
  const connection = await client.connect({
    host: DATABRICKS_HOST,
    path: DATABRICKS_PATH,
    token: DATABRICKS_TOKEN,
  });

  try {
    const session = await connection.openSession();

    // Listar todos os schemas no catalog data_workspace
    console.log('📂 Schemas disponíveis em data_workspace:');
    const schemasResult = await session.executeStatement(
      'SHOW SCHEMAS IN data_workspace'
    );
    const schemas = await schemasResult.fetchAll();
    await schemasResult.close();
    
    schemas.forEach(s => console.log(`   - ${s.databaseName}`));

    // Procurar tabelas com "management" ou "classification" no nome em cada schema
    console.log('\n🔎 Procurando tabelas relacionadas a management/classification:\n');
    
    for (const schema of schemas) {
      const schemaName = schema.databaseName;
      try {
        await session.executeStatement(`USE SCHEMA ${schemaName}`);
        const tablesResult = await session.executeStatement('SHOW TABLES');
        const tables = await tablesResult.fetchAll();
        await tablesResult.close();
        
        const relevantTables = tables.filter(t => 
          t.tableName.toLowerCase().includes('management') || 
          t.tableName.toLowerCase().includes('classification') ||
          t.tableName.toLowerCase().includes('system')
        );
        
        if (relevantTables.length > 0) {
          console.log(`📋 Schema: ${schemaName}`);
          relevantTables.forEach(t => {
            console.log(`   ✓ ${t.tableName}`);
          });
          
          // Mostrar estrutura da primeira tabela encontrada
          if (relevantTables.length > 0) {
            const firstTable = relevantTables[0].tableName;
            console.log(`\n   📊 Estrutura de ${schemaName}.${firstTable}:`);
            const descResult = await session.executeStatement(`DESCRIBE ${firstTable}`);
            const columns = await descResult.fetchAll();
            await descResult.close();
            
            columns.slice(0, 10).forEach(col => {
              console.log(`      - ${col.col_name} (${col.data_type})`);
            });
            
            // Contar registros
            const countResult = await session.executeStatement(`SELECT COUNT(*) as total FROM ${firstTable}`);
            const count = await countResult.fetchAll();
            await countResult.close();
            console.log(`      Total de registros: ${count[0].total}`);
            
            // Tentar contar classification = true
            try {
              const classifResult = await session.executeStatement(
                `SELECT COUNT(*) as total FROM ${firstTable} WHERE classification = true`
              );
              const classifCount = await classifResult.fetchAll();
              await classifResult.close();
              console.log(`      Com classification=true: ${classifCount[0].total}`);
            } catch (e) {
              // Coluna classification não existe
            }
          }
          console.log();
        }
      } catch (error) {
        // Schema sem permissão ou não acessível, ignorar
      }
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

checkManagementTables()
  .then(() => {
    console.log('✅ Busca concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha:', error);
    process.exit(1);
  });
