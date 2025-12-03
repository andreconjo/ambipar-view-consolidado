const { DBSQLClient } = require('@databricks/sql');
const bcrypt = require('bcrypt');

async function main() {
  const client = new DBSQLClient();
  
  const connectionOptions = {
    host: process.env.DATABRICKS_SERVER_HOSTNAME,
    path: process.env.DATABRICKS_HTTP_PATH,
    token: process.env.DATABRICKS_ACCESS_TOKEN,
  };

  console.log('🔌 Conectando ao Azure Databricks...');
  const connection = await client.connect(connectionOptions);
  
  try {
    const session = await connection.openSession();
    
    // Verificar tabelas existentes
    console.log('\n📊 Verificando tabelas...');
    const tables = await session.executeStatement("SHOW TABLES IN default");
    const tablesList = await tables.fetchAll();
    
    console.log('Tabelas encontradas:');
    tablesList.forEach(table => {
      console.log(`  - ${table.database}.${table.tableName}`);
    });
    
    // Verificar estrutura da tabela tb_usuarios
    const tbUsuariosExists = tablesList.some(t => t.tableName === 'tb_usuarios');
    
    if (tbUsuariosExists) {
      console.log('\n📋 Estrutura da tabela tb_usuarios:');
      const describe = await session.executeStatement("DESCRIBE default.tb_usuarios");
      const columns = await describe.fetchAll();
      columns.forEach(col => {
        console.log(`  - ${col.col_name}: ${col.data_type}`);
      });
      
      // Contar usuários existentes
      console.log('\n👥 Verificando usuários existentes...');
      const countQuery = await session.executeStatement("SELECT COUNT(*) as total FROM default.tb_usuarios");
      const countResult = await countQuery.fetchAll();
      console.log(`Total de usuários: ${countResult[0].total}`);
      
      // Verificar admin
      console.log('\n🔍 Verificando se usuário conjo existe...');
      const checkAdmin = await session.executeStatement("SELECT * FROM default.tb_usuarios WHERE username = 'conjo'");
      const adminResult = await checkAdmin.fetchAll();
      
      if (adminResult.length === 0) {
        console.log('❌ Usuário conjo não encontrado');
        console.log('\n👤 Inserindo usuário admin...');
        
        const passwordHash = bcrypt.hashSync('admin123', 10);
        
        // Buscar próximo ID
        const maxIdQuery = await session.executeStatement('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM default.tb_usuarios');
        const maxIdResult = await maxIdQuery.fetchAll();
        const nextId = maxIdResult[0].next_id;
        
        console.log(`Próximo ID: ${nextId}`);
        
        await session.executeStatement(`
          INSERT INTO default.tb_usuarios (id, username, password_hash, nome_completo, tipo_usuario, ativo)
          VALUES (${nextId}, 'conjo', '${passwordHash}', 'Conjo Admin', 'admin', true)
        `);
        
        console.log('✅ Usuário admin inserido com sucesso!');
        console.log('   Username: conjo');
        console.log('   Password: admin123');
        
      } else {
        console.log('✅ Usuário conjo já existe:');
        adminResult.forEach(user => {
          console.log(`   ID: ${user.id}`);
          console.log(`   Username: ${user.username}`);
          console.log(`   Nome: ${user.nome_completo}`);
          console.log(`   Tipo: ${user.tipo_usuario}`);
          console.log(`   Ativo: ${user.ativo}`);
        });
      }
      
    } else {
      console.log('❌ Tabela tb_usuarios não encontrada!');
      console.log('Execute primeiro o script create-azure-tables.js');
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

main()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
