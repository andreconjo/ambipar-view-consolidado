#!/usr/bin/env node

/**
 * Script para testar o endpoint de scrapers health
 */

const BASE_URL = 'http://localhost:5001';

// Dados de login
const LOGIN_PAYLOAD = {
  username: 'conjo',
  password: 'admin123'
};

// Dados de exemplo de scraper health
const SCRAPER_HEALTH_EXAMPLES = [
  {
    service: 'scraper_sp_leis',
    total_registros: 1523,
    execution_time: 127,
    state: 'SP',
    status: 'success',
  },
  {
    service: 'scraper_rj_leis',
    total_registros: 892,
    execution_time: 94,
    state: 'RJ',
    status: 'success',
  },
  {
    service: 'scraper_mg_leis',
    total_registros: 0,
    execution_time: 45,
    state: 'MG',
    status: 'error',
    error_message: 'Failed to connect to data source',
  },
  {
    service: 'scraper_ba_leis',
    total_registros: 2341,
    execution_time: 234,
    state: 'BA',
    status: 'success',
  },
];

async function testScrapersEndpoint() {
  console.log('🧪 Testando endpoint de scrapers health\n');

  try {
    // 1. Login
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(LOGIN_PAYLOAD),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const { access_token } = await loginResponse.json();
    console.log('✅ Login realizado com sucesso\n');

    // 2. Inserir dados de exemplo
    console.log('2️⃣ Inserindo dados de exemplo...');
    for (const health of SCRAPER_HEALTH_EXAMPLES) {
      const response = await fetch(`${BASE_URL}/scrapers/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify(health),
      });

      if (response.ok) {
        console.log(`   ✅ ${health.service} (${health.state}) - ${health.status}`);
      } else {
        console.error(`   ❌ Erro ao inserir ${health.service}:`, await response.text());
      }
    }
    console.log('');

    // 3. Buscar todos os registros
    console.log('3️⃣ Buscando todos os registros...');
    const allResponse = await fetch(`${BASE_URL}/scrapers/health?limit=10`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (allResponse.ok) {
      const allRecords = await allResponse.json();
      console.log(`   ✅ ${allRecords.length} registros encontrados`);
      console.log('');
    } else {
      console.error('   ❌ Erro ao buscar registros');
    }

    // 4. Filtrar por status
    console.log('4️⃣ Filtrando por status=error...');
    const errorResponse = await fetch(`${BASE_URL}/scrapers/health?status=error`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (errorResponse.ok) {
      const errorRecords = await errorResponse.json();
      console.log(`   ✅ ${errorRecords.length} registros com erro encontrados`);
      errorRecords.forEach(record => {
        console.log(`      - ${record.service}: ${record.error_message}`);
      });
      console.log('');
    }

    // 5. Buscar estatísticas
    console.log('5️⃣ Buscando estatísticas...');
    const statsResponse = await fetch(`${BASE_URL}/scrapers/health/stats`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`   ✅ Estatísticas por serviço e status:\n`);
      stats.forEach(stat => {
        console.log(`      ${stat.service} (${stat.status}):`);
        console.log(`         Count: ${stat.count}`);
        console.log(`         Avg Time: ${stat.avg_execution_time}s`);
        console.log(`         Last: ${stat.last_execution}`);
      });
    }

    console.log('\n✅ Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.message);
    process.exit(1);
  }
}

testScrapersEndpoint();
