# Página de Monitoramento de Scrapers

Página frontend criada para visualizar a execução e status dos scrapers de dados, com gráficos interativos usando ApexCharts.

## 🎯 Funcionalidades

### Visualizações
- **Execuções por Dia**: Gráfico de linha mostrando execuções bem-sucedidas vs com erro
- **Distribuição por Status**: Gráfico de pizza (donut) mostrando proporção de sucesso/erro/executando
- **Execuções por Serviço**: Gráfico de barras horizontais mostrando volume por scraper
- **Tabela de Scrapers Funcionando**: Lista de scrapers com dados recentes

### Filtros
- Últimos 7 dias
- Últimos 15 dias
- Últimos 30 dias

### Cards de Resumo
- Total de Execuções
- Scrapers Ativos
- Scrapers Funcionando (com dados no período)
- Taxa de Sucesso (%)

## 🚀 Como Testar

### 1. Popular dados de exemplo no Azure Databricks

```bash
cd api
export $(cat .env | xargs)
node scripts/populate-scrapers-data.js
```

Este script irá inserir ~90 registros dos últimos 15 dias com dados simulados de 6 scrapers diferentes.

### 2. Iniciar o backend (se não estiver rodando)

```bash
cd api
pnpm run start:dev
```

### 3. Iniciar o frontend (se não estiver rodando)

```bash
cd frontend
pnpm run dev
```

### 4. Acessar a página

1. Faça login com: `conjo` / `admin123`
2. Clique no menu **"Scrapers"**
3. Visualize os gráficos e dados

## 📊 Estrutura dos Dados

### Tabela Azure: `default.tb_health_scrappers`

```sql
- id: BIGINT (identity)
- service: STRING (nome do scraper)
- total_registros: BIGINT (quantidade extraída)
- execution_time: BIGINT (tempo em segundos)
- state: STRING (UF onde executou)
- status: STRING (success/error/running)
- error_message: STRING (mensagem de erro, se houver)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 🔌 Endpoints da API

### GET /scrapers/health
Lista execuções com filtros opcionais:
- `service` - Filtrar por nome do scraper
- `state` - Filtrar por UF
- `status` - Filtrar por status (success/error/running)
- `startDate` - Data inicial (ISO 8601)
- `endDate` - Data final (ISO 8601)
- `limit` - Limitar resultados (padrão: 100)

### GET /scrapers/health/stats
Retorna estatísticas agregadas:
- Execuções por serviço e status
- Tempo médio de execução
- Última execução

### POST /scrapers/health
Receber status de execução do scraper:
```json
{
  "service": "scraper_sp_leis",
  "total_registros": 1523,
  "execution_time": 127,
  "state": "SP",
  "status": "success"
}
```

## 🎨 Componentes Criados

### Frontend
- `/src/pages/ScrapersPage.tsx` - Página principal
- `/src/services/scrapers.service.ts` - Service para API
- Atualizado `/src/components/Layout.tsx` - Menu com link Scrapers
- Atualizado `/src/App.tsx` - Rota `/scrapers`

### Backend
- `/src/scrapers/scrapers.module.ts` - Módulo NestJS
- `/src/scrapers/scrapers.controller.ts` - Controller
- `/src/scrapers/scrapers.service.ts` - Service
- `/src/scrapers/dto/scraper-health.dto.ts` - DTOs
- Atualizado `/src/database/database.service.ts` - Métodos queryScrapers/executeScrapers

### Scripts
- `/scripts/create-health-scrappers-table.js` - Criar tabela no Azure
- `/scripts/populate-scrapers-data.js` - Popular dados de exemplo
- `/scripts/test-scrapers-endpoint.js` - Testar endpoints

## 📝 Notas

- Todos os endpoints estão protegidos com JWT (mesmo token usado nos outros endpoints)
- Scrapers são considerados "funcionando" quando têm status=success no período
- A página atualiza estatísticas automaticamente a cada 30 segundos
- Dados são carregados do Azure Databricks em tempo real
