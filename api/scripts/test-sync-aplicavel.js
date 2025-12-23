#!/usr/bin/env node

/**
 * Script para testar a sincronização de normas aplicáveis
 * Verifica se os dados entre management_systems_classifications e tb_normas_consolidadas estão corretos
 * 
 * Usa Azure Databricks como banco de dados
 */

require('dotenv').config();
const { DBSQLClient } = require('@databricks/sql');

// Configurações do Databricks
const DATABRICKS_HOST = process.env.DATABRICKS_SERVER_HOSTNAME;
const DATABRICKS_PATH = process.env.DATABRICKS_HTTP_PATH;
const DATABRICKS_TOKEN = process.env.DATABRICKS_ACCESS_TOKEN;

// Schemas
const NORMAS_TABLE = 'data_workspace.unificado.tb_normas_consolidadas';
const MANAGEMENT_TABLE = 'data_workspace.models.management_systems_classifications';

console.log('='.repeat(60));
console.log('TESTE DE SINCRONIZAÇÃO - SYNC APLICÁVEL');
console.log('='.repeat(60));
console.log(`\nDatabricks Host: ${DATABRICKS_HOST}`);
console.log(`Normas Table: ${NORMAS_TABLE}`);
console.log(`Management Table: ${MANAGEMENT_TABLE}\n`);

async function runTests() {
  let client, connection, session;

  try {
    // Conectar ao Databricks
    console.log('Conectando ao Azure Databricks...');
    client = new DBSQLClient();
    
    connection = await client.connect({
      host: DATABRICKS_HOST,
      path: DATABRICKS_PATH,
      token: DATABRICKS_TOKEN,
    });
    
    session = await connection.openSession();
    console.log('✅ Conectado com sucesso!\n');

    // Helper para executar queries
    async function runQuery(sql) {
      const operation = await session.executeStatement(sql);
      const result = await operation.fetchAll();
      await operation.close();
      return result;
    }

    // 1. Contar registros únicos com classification = true
    console.log('1. REGISTROS COM CLASSIFICATION = TRUE (management_systems_classifications)');
    console.log('-'.repeat(60));
    
    const totalClassificadas = await runQuery(`
      SELECT COUNT(DISTINCT norm_id) as total_normas_classificadas
      FROM ${MANAGEMENT_TABLE}
      WHERE classification = true
    `);
    console.log(`   Total de norm_ids únicos classificados: ${totalClassificadas[0]?.total_normas_classificadas || 0}`);

    const totalRegistros = await runQuery(`
      SELECT COUNT(*) as total
      FROM ${MANAGEMENT_TABLE}
      WHERE classification = true
    `);
    console.log(`   Total de registros com classification=true: ${totalRegistros[0]?.total || 0}`);

    // 2. Contar normas aplicáveis
    console.log('\n2. NORMAS MARCADAS COMO APLICÁVEL (tb_normas_consolidadas)');
    console.log('-'.repeat(60));
    
    const totalAplicaveis = await runQuery(`
      SELECT COUNT(*) as total_aplicaveis
      FROM ${NORMAS_TABLE}
      WHERE aplicavel = true
    `);
    console.log(`   Total de normas com aplicavel=true: ${totalAplicaveis[0]?.total_aplicaveis || 0}`);

    // 3. Listar norm_ids classificados
    console.log('\n3. NORM_IDS CLASSIFICADOS (primeiros 20)');
    console.log('-'.repeat(60));
    
    const normIdsClassificados = await runQuery(`
      SELECT DISTINCT norm_id, mngm_sys
      FROM ${MANAGEMENT_TABLE}
      WHERE classification = true
      ORDER BY norm_id
      LIMIT 20
    `);
    
    if (normIdsClassificados.length > 0) {
      console.log('   norm_id | mngm_sys');
      console.log('   ' + '-'.repeat(40));
      normIdsClassificados.forEach(row => {
        console.log(`   ${row.norm_id} | ${row.mngm_sys || 'NULL'}`);
      });
    } else {
      console.log('   Nenhum registro encontrado!');
    }

    // 4. Verificar se os norm_ids existem em tb_normas_consolidadas (via JOIN)
    console.log('\n4. VERIFICANDO SE NORM_IDS EXISTEM EM TB_NORMAS_CONSOLIDADAS');
    console.log('-'.repeat(60));
    
    // Contar quantos norm_ids classificados existem na tabela de normas
    const existentes = await runQuery(`
      SELECT COUNT(DISTINCT m.norm_id) as total
      FROM ${MANAGEMENT_TABLE} m
      INNER JOIN ${NORMAS_TABLE} n ON m.norm_id = n.id
      WHERE m.classification = true
    `);
    
    const classificadosCount = totalClassificadas[0]?.total_normas_classificadas || 0;
    const existentesCount = existentes[0]?.total || 0;
    
    console.log(`   norm_ids classificados: ${classificadosCount}`);
    console.log(`   Existem em tb_normas_consolidadas: ${existentesCount}`);
    console.log(`   Órfãos (não existem): ${classificadosCount - existentesCount}`);

    // Listar os órfãos se houver
    if (classificadosCount > existentesCount) {
      const orfaos = await runQuery(`
        SELECT DISTINCT m.norm_id
        FROM ${MANAGEMENT_TABLE} m
        LEFT JOIN ${NORMAS_TABLE} n ON m.norm_id = n.id
        WHERE m.classification = true
          AND n.id IS NULL
        LIMIT 30
      `);
      
      if (orfaos.length > 0) {
        console.log(`\n   ⚠️  NORM_IDS ÓRFÃOS (não existem em tb_normas_consolidadas):`);
        console.log(`   ${orfaos.map(r => r.norm_id).join(', ')}`);
      }
    }

    // 5. Verificar normas aplicáveis que deveriam estar marcadas
    console.log('\n5. NORMAS APLICÁVEIS - DETALHES (primeiros 20)');
    console.log('-'.repeat(60));
    
    const normasAplicaveis = await runQuery(`
      SELECT id, numero_norma, aplicavel, sistema_gestao
      FROM ${NORMAS_TABLE}
      WHERE aplicavel = true
      ORDER BY id
      LIMIT 20
    `);
    
    if (normasAplicaveis.length > 0) {
      console.log('   id | numero_norma | aplicavel | sistema_gestao');
      console.log('   ' + '-'.repeat(55));
      normasAplicaveis.forEach(row => {
        const numNorma = (row.numero_norma || 'NULL').substring(0, 25);
        console.log(`   ${row.id} | ${numNorma} | ${row.aplicavel} | ${row.sistema_gestao || 'NULL'}`);
      });
    } else {
      console.log('   Nenhuma norma marcada como aplicável!');
    }

    // 6. Verificar normas que deveriam ser aplicáveis mas não estão
    console.log('\n6. NORMAS QUE DEVERIAM SER APLICÁVEIS MAS NÃO ESTÃO');
    console.log('-'.repeat(60));
    
    const naoMarcadas = await runQuery(`
      SELECT DISTINCT m.norm_id, n.numero_norma, n.aplicavel
      FROM ${MANAGEMENT_TABLE} m
      INNER JOIN ${NORMAS_TABLE} n ON m.norm_id = n.id
      WHERE m.classification = true
        AND (n.aplicavel IS NULL OR n.aplicavel = false)
      LIMIT 20
    `);
    
    if (naoMarcadas.length > 0) {
      console.log('   ⚠️  Normas com classification=true mas aplicavel=false:');
      console.log('   norm_id | numero_norma | aplicavel');
      console.log('   ' + '-'.repeat(45));
      naoMarcadas.forEach(row => {
        const numNorma = (row.numero_norma || 'NULL').substring(0, 25);
        console.log(`   ${row.norm_id} | ${numNorma} | ${row.aplicavel}`);
      });
    } else {
      console.log('   ✅ Todas as normas classificadas estão marcadas como aplicáveis!');
    }

    // 7. Resumo Final
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO FINAL');
    console.log('='.repeat(60));
    
    const aplicaveisCount = totalAplicaveis[0]?.total_aplicaveis || 0;
    
    console.log(`\n   📊 Normas classificadas (management):     ${classificadosCount}`);
    console.log(`   📊 Norm_ids que existem em consolidadas:  ${existentesCount}`);
    console.log(`   📊 Normas aplicáveis (consolidadas):      ${aplicaveisCount}`);
    
    if (existentesCount === aplicaveisCount) {
      console.log('\n   ✅ SINCRONIZAÇÃO CORRETA! Os números batem.');
    } else {
      console.log(`\n   ⚠️  DIFERENÇA DETECTADA: ${Math.abs(existentesCount - aplicaveisCount)} registros`);
      console.log('   Possíveis causas:');
      if (existentesCount > aplicaveisCount) {
        console.log('   - Sync não foi executado após classificações');
      } else {
        console.log('   - Há normas aplicáveis que não têm classificação (dados antigos?)');
      }
    }

    if (classificadosCount > existentesCount) {
      console.log(`\n   ⚠️  ${classificadosCount - existentesCount} norm_ids órfãos encontrados`);
      console.log('   (referências a normas que não existem mais)');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
  } finally {
    // Fechar conexões
    try {
      if (session) await session.close();
      if (connection) await connection.close();
      if (client) await client.close();
    } catch (e) {
      // Ignorar erros ao fechar
    }
  }
}

runTests();
