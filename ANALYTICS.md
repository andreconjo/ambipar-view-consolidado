# Página de Análise - Dashboard Analytics

## 📊 Funcionalidades

A página de análise fornece visualizações gráficas dos dados de normas consolidadas:

### Gráficos Disponíveis

1. **Quantidade de Leis por Origem de Dado** (Gráfico de Pizza)
   - Mostra a distribuição de normas por origem de dado
   - Endpoint: `GET /analytics/origem`

2. **Quantidade por Origem de Publicação** (Gráfico de Donut)
   - Exibe a distribuição por origem de publicação
   - Endpoint: `GET /analytics/origem-publicacao`

3. **Top 20 Municípios com Mais Normas** (Gráfico de Barras Horizontal)
   - Lista os 20 municípios com maior volume de normas
   - Endpoint: `GET /analytics/municipio`

4. **Última Sincronização por Origem** (Tabela)
   - Mostra quando cada origem foi sincronizada pela última vez
   - Endpoint: `GET /analytics/sincronizacao`

5. **Volume de Publicações por Dia** (Gráfico de Linha)
   - Visualiza o volume diário de publicações nos últimos 90 dias
   - Endpoint: `GET /analytics/volume-dia`

## 🚀 Tecnologias

- **React** - Framework UI
- **ApexCharts** - Biblioteca de gráficos
- **React-ApexCharts** - Wrapper React para ApexCharts
- **Tailwind CSS** - Estilização
- **React Query** - Gerenciamento de estado

## 📡 Endpoints da API

### GET /analytics/origem
Retorna a quantidade de leis agrupadas por origem de dado.

**Resposta:**
```json
[
  { "origem": "LegislacaoWeb", "total": 1500 },
  { "origem": "LeisMunicipais", "total": 800 }
]
```

### GET /analytics/origem-publicacao
Retorna a quantidade agrupada por origem de publicação.

**Resposta:**
```json
[
  { "origem": "Diário Oficial", "total": 2000 },
  { "origem": "Portal Legislativo", "total": 300 }
]
```

### GET /analytics/municipio
Retorna os 20 municípios com mais normas.

**Resposta:**
```json
[
  { "municipio": "São Paulo", "total": 500 },
  { "municipio": "Rio de Janeiro", "total": 350 }
]
```

### GET /analytics/sincronizacao
Retorna a última data de sincronização por origem.

**Resposta:**
```json
[
  { 
    "origem": "LegislacaoWeb", 
    "ultima_sincronizacao": "2025-11-12T10:30:00" 
  }
]
```

### GET /analytics/volume-dia
Retorna o volume de publicações por dia dos últimos 90 dias.

**Resposta:**
```json
[
  { "dia": "2025-11-12", "total": 45 },
  { "dia": "2025-11-11", "total": 38 }
]
```

## 🎨 Personalização

Os gráficos podem ser personalizados através das opções do ApexCharts:

```typescript
const options: ApexOptions = {
  chart: { 
    type: 'bar',
    fontFamily: 'Inter, system-ui, sans-serif' 
  },
  colors: ['#3b82f6'], // Cores personalizadas
  // ... outras opções
};
```

## 🔗 Navegação

A aplicação possui navegação entre duas páginas:
- **Normas** - Listagem e gerenciamento de normas
- **Análises** - Dashboard com gráficos e estatísticas

## 🛠️ Desenvolvimento

Para adicionar novos gráficos:

1. Crie o endpoint no backend (`backend/app.py`)
2. Adicione o método no serviço (`analytics.service.ts`)
3. Atualize a página para consumir os dados (`AnalyticsPage.tsx`)
4. Configure o gráfico usando ApexCharts

## 📱 Responsividade

Todos os gráficos são responsivos e se adaptam a diferentes tamanhos de tela:
- Desktop: 2 colunas
- Tablet: 1 coluna
- Mobile: 1 coluna com gráficos compactos
