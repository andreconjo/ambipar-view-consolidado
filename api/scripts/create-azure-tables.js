const { DBSQLClient } = require('@databricks/sql');
const bcrypt = require('bcrypt');

async function createTables() {
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
    
    console.log('\n📋 Criando tabela tb_usuarios...');
    await session.executeStatement(`
      CREATE TABLE IF NOT EXISTS tb_usuarios (
        id BIGINT NOT NULL,
        username STRING NOT NULL,
        password_hash STRING NOT NULL,
        nome_completo STRING NOT NULL,
        tipo_usuario STRING NOT NULL,
        ativo BOOLEAN DEFAULT true,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_usuarios PRIMARY KEY (id),
        CONSTRAINT uk_usuarios_username UNIQUE (username)
      )
      USING DELTA
      COMMENT 'Tabela de usuários do sistema'
    `);
    console.log('✓ Tabela tb_usuarios criada');

    console.log('\n📋 Criando tabela tb_normas_aprovacoes...');
    await session.executeStatement(`
      CREATE TABLE IF NOT EXISTS tb_normas_aprovacoes (
        id BIGINT NOT NULL,
        norma_id BIGINT NOT NULL,
        status STRING NOT NULL,
        solicitante STRING NOT NULL,
        data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        observacao STRING,
        CONSTRAINT pk_aprovacoes PRIMARY KEY (id)
      )
      USING DELTA
      COMMENT 'Tabela de histórico de aprovações de normas'
    `);
    console.log('✓ Tabela tb_normas_aprovacoes criada');

    console.log('\n📋 Verificando se usuário admin existe...');
    
    // Esperar um pouco para o schema ser atualizado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const checkAdmin = await session.executeStatement(
      "SELECT COUNT(*) as count FROM default.tb_usuarios WHERE username = 'conjo'"
    );
    const adminExists = await checkAdmin.fetchAll();
    
    if (adminExists[0].count === 0) {
      console.log('👤 Criando usuário admin...');
      const passwordHash = bcrypt.hashSync('admin123', 10);
      
      // Buscar próximo ID
      const maxIdQuery = await session.executeStatement('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM default.tb_usuarios');
      const maxIdResult = await maxIdQuery.fetchAll();
      const nextId = maxIdResult[0].next_id;
      
      await session.executeStatement(`
        INSERT INTO default.tb_usuarios (id, username, password_hash, nome_completo, tipo_usuario, ativo)
        VALUES (${nextId}, 'conjo', '${passwordHash}', 'Conjo', 'admin', true)
      `);
      console.log('✓ Usuário admin criado (username: conjo, password: admin123)');
    } else {
      console.log('✓ Usuário admin já existe');
    }

    console.log('\n📊 Resumo das tabelas:');
    const tables = await session.executeStatement("SHOW TABLES LIKE 'tb_*'");
    const tablesList = await tables.fetchAll();
    tablesList.forEach(table => {
      console.log(`  - ${table.tableName}`);
    });

    await session.close();
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro na migração:', error.message);
    throw error;
  } finally {
    await connection.close();
    await client.close();
  }
}

// Executar
createTables()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
