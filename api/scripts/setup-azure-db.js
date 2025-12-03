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
    
    // Verificar catalog e schema atual
    console.log('\n📍 Verificando contexto atual...');
    const currentCatalog = await session.executeStatement("SELECT current_catalog()");
    const catalogResult = await currentCatalog.fetchAll();
    console.log(`Catalog atual: ${catalogResult[0]['current_catalog()']}`);
    
    const currentSchema = await session.executeStatement("SELECT current_schema()");
    const schemaResult = await currentSchema.fetchAll();
    console.log(`Schema atual: ${schemaResult[0]['current_schema()']}`);
    
    // Listar todas as tabelas no schema default
    console.log('\n📊 Tabelas existentes no schema default:');
    const tables = await session.executeStatement("SHOW TABLES IN default");
    const tablesList = await tables.fetchAll();
    tablesList.forEach(table => {
      console.log(`  - ${table.tableName}`);
    });
    
    // Verificar se tb_usuarios existe
    const tbUsuariosExists = tablesList.some(t => t.tableName === 'tb_usuarios');
    const tbAprovacoesExists = tablesList.some(t => t.tableName === 'tb_normas_aprovacoes');
    
    // Criar tb_usuarios se não existir
    if (!tbUsuariosExists) {
      console.log('\n📋 Criando tabela default.tb_usuarios...');
      await session.executeStatement(`
        CREATE TABLE default.tb_usuarios (
          id BIGINT NOT NULL,
          username STRING NOT NULL,
          password_hash STRING NOT NULL,
          nome_completo STRING NOT NULL,
          tipo_usuario STRING NOT NULL,
          ativo BOOLEAN,
          data_criacao TIMESTAMP
        )
        USING DELTA
        COMMENT 'Tabela de usuários do sistema'
      `);
      console.log('✅ Tabela tb_usuarios criada');
    } else {
      console.log('\n✓ Tabela tb_usuarios já existe');
    }
    
    // Criar tb_normas_aprovacoes se não existir
    if (!tbAprovacoesExists) {
      console.log('\n📋 Criando tabela default.tb_normas_aprovacoes...');
      await session.executeStatement(`
        CREATE TABLE default.tb_normas_aprovacoes (
          id BIGINT NOT NULL,
          norma_id BIGINT NOT NULL,
          status STRING NOT NULL,
          solicitante STRING NOT NULL,
          data_registro TIMESTAMP,
          observacao STRING
        )
        USING DELTA
        COMMENT 'Tabela de histórico de aprovações de normas'
      `);
      console.log('✅ Tabela tb_normas_aprovacoes criada');
    } else {
      console.log('\n✓ Tabela tb_normas_aprovacoes já existe');
    }
    
    // Aguardar para garantir que as tabelas estão disponíveis
    console.log('\n⏳ Aguardando propagação do schema (3 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar admin
    console.log('\n🔍 Verificando usuário admin...');
    const checkAdmin = await session.executeStatement(
      "SELECT * FROM default.tb_usuarios WHERE username = 'conjo'"
    );
    const adminResult = await checkAdmin.fetchAll();
    
    if (adminResult.length === 0) {
      console.log('\n👤 Criando usuário admin...');
      const passwordHash = bcrypt.hashSync('admin123', 10);
      
      // Buscar próximo ID
      const maxIdQuery = await session.executeStatement(
        'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM default.tb_usuarios'
      );
      const maxIdResult = await maxIdQuery.fetchAll();
      const nextId = maxIdResult[0].next_id;
      
      console.log(`Inserindo com ID: ${nextId}`);
      
      await session.executeStatement(`
        INSERT INTO default.tb_usuarios 
        (id, username, password_hash, nome_completo, tipo_usuario, ativo, data_criacao)
        VALUES 
        (${nextId}, 'conjo', '${passwordHash}', 'Conjo Admin', 'admin', true, current_timestamp())
      `);
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('   Username: conjo');
      console.log('   Password: admin123');
      
    } else {
      console.log('✅ Usuário admin já existe:');
      adminResult.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Nome: ${user.nome_completo}`);
        console.log(`   Tipo: ${user.tipo_usuario}`);
        console.log(`   Ativo: ${user.ativo}`);
      });
    }
    
    // Verificar resultado final
    console.log('\n📊 Resumo final:');
    const finalTables = await session.executeStatement("SHOW TABLES IN default");
    const finalTablesList = await finalTables.fetchAll();
    const appTables = finalTablesList.filter(t => 
      t.tableName === 'tb_usuarios' || t.tableName === 'tb_normas_aprovacoes'
    );
    
    console.log('Tabelas da aplicação:');
    appTables.forEach(table => {
      console.log(`  ✓ ${table.tableName}`);
    });
    
    const countUsers = await session.executeStatement("SELECT COUNT(*) as total FROM default.tb_usuarios");
    const totalUsers = await countUsers.fetchAll();
    console.log(`\nTotal de usuários: ${totalUsers[0].total}`);
    
    await session.close();
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

main()
  .then(() => {
    console.log('\n✅ Setup completo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
