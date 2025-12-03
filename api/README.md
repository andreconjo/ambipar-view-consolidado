# NestJS API - Ambipar View Consolidado

API REST desenvolvida com NestJS + TypeScript + DuckDB para gerenciamento de normas consolidadas.

## 🚀 Stack Tecnológica

- **Framework**: NestJS 11
- **Linguagem**: TypeScript (strict mode)
- **Banco de Dados**: DuckDB
- **Autenticação**: JWT com Passport
- **Validação**: Class-validator + Class-transformer
- **Agendamento**: @nestjs/schedule (Cron jobs)
- **Package Manager**: pnpm

## 📁 Estrutura do Projeto

```
api/
├── src/
│   ├── auth/                    # Autenticação JWT
│   │   ├── decorators/          # @CurrentUser decorator
│   │   ├── guards/              # JWT & Admin guards
│   │   ├── strategies/          # Passport JWT strategy
│   │   └── dto/                 # Login DTO
│   ├── users/                   # Gerenciamento de usuários
│   ├── normas/                  # CRUD de normas
│   ├── aprovacoes/              # Workflow de aprovações
│   ├── analytics/               # Endpoints de analytics
│   ├── management-systems/      # Sistemas de gestão
│   ├── azure-sync/              # Sincronização com Databricks
│   ├── database/                # DuckDB service
│   ├── common/                  # Shared resources
│   │   ├── filters/             # Exception filters
│   │   ├── interceptors/        # Logging interceptor
│   │   └── interfaces/          # Shared interfaces
│   └── config/                  # Configuração da aplicação
├── data/                        # DuckDB databases
├── .env                         # Variáveis de ambiente
└── package.json
```

## 🔧 Configuração

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` baseado em `.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_PATH=./data/tb_normas_consolidadas.db
DB_MANAGEMENT_PATH=./data/management_systems_classifications.db

# Databricks (opcional - para sincronização)
DATABRICKS_SERVER_HOSTNAME=your-databricks-server.azuredatabricks.net
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/your-warehouse-id
DATABRICKS_ACCESS_TOKEN=your-databricks-token

# JWT
SECRET_KEY=ambipar-secret-key-change-in-production
JWT_EXPIRATION=7d
```

### 3. Inicializar Banco de Dados

O banco de dados DuckDB será automaticamente inicializado na primeira execução com:
- Tabela `tb_usuarios` com usuário admin padrão
- Tabela `tb_normas_aprovacoes`
- Sequências para IDs

**Usuário Admin Padrão:**
- Username: `conjo`
- Password: `admin123`

## 🏃 Executar a Aplicação

### Desenvolvimento

```bash
pnpm run start:dev
```

A API estará disponível em: `http://localhost:5000/api`

### Produção

```bash
pnpm run build
pnpm run start:prod
```

## 📚 Endpoints da API

### Autenticação

#### POST /api/auth/login
Login de usuário

**Request:**
```json
{
  "username": "conjo",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "conjo",
    "nome_completo": "Administrador",
    "tipo_usuario": "admin"
  }
}
```

### Usuários (Admin Only)

- `GET /api/usuarios` - Listar todos usuários
- `GET /api/usuarios/:id` - Buscar usuário por ID
- `POST /api/usuarios` - Criar novo usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Remover usuário

### Normas

- `GET /api/normas` - Listar normas (com filtros e paginação)
- `GET /api/normas/:id` - Buscar norma por ID
- `GET /api/normas/filtros/valores` - Obter valores únicos para filtros
- `POST /api/normas/sync-aplicavel` - Sincronizar campo aplicavel

**Filtros disponíveis:**
- `tipo_norma`
- `status_vigencia`
- `divisao_politica`
- `origem_publicacao`
- `origem_dado`
- `aplicavel` (true/false)
- `search` (busca em ementa e numero_norma)
- `page` (padrão: 1)
- `per_page` (padrão: 50, máx: 100)

**Exemplo:**
```
GET /api/normas?tipo_norma=Lei&aplicavel=true&page=1&per_page=20
```

### Aprovações

- `GET /api/aprovacoes` - Listar aprovações
- `GET /api/aprovacoes/:id` - Buscar aprovação por ID
- `POST /api/aprovacoes` - Criar aprovação
- `PUT /api/aprovacoes/:id` - Atualizar aprovação
- `DELETE /api/aprovacoes/:id` - Remover aprovação

### Analytics

- `GET /api/analytics/resumo` - Resumo geral
- `GET /api/analytics/municipio` - Top 20 municípios
- `GET /api/analytics/origem-publicacao` - Origem de publicação
- `GET /api/analytics/normas-por-ano` - Distribuição por ano
- `GET /api/analytics/normas-por-tipo` - Distribuição por tipo
- `GET /api/analytics/normas-por-status` - Distribuição por status
- `GET /api/analytics/normas-por-origem` - Distribuição por origem de dado
- `GET /api/analytics/aplicabilidade` - Estatísticas de aplicabilidade

### Management Systems

- `GET /api/management-systems/classifications` - Todas classificações
- `GET /api/management-systems/classifications/norma/:numeroNorma` - Por norma
- `GET /api/management-systems/classifications/sistema/:sistemaGestao` - Por sistema
- `GET /api/management-systems/sistemas` - Lista de sistemas
- `GET /api/management-systems/stats` - Estatísticas

### Databricks Sync (Admin Only)

- `POST /api/azure-sync/normas` - Sincronizar normas do Databricks
- `POST /api/azure-sync/classifications` - Sincronizar classificações do Databricks
- `POST /api/azure-sync/all` - Sincronizar tudo do Databricks

### Health Check

- `GET /api/health` - Status da aplicação e banco de dados

## 🔐 Autenticação

Todos os endpoints (exceto `/auth/login` e `/health`) requerem autenticação JWT.

**Header:**
```
Authorization: Bearer <access_token>
```

**Roles:**
- `admin` - Acesso total (gerenciar usuários, sync Databricks)
- `user` - Acesso read-only às normas e analytics

## ⏰ Cron Jobs

A aplicação executa sincronizações automáticas:

- **Diariamente à meia-noite**: Sincroniza normas do Databricks
- **Semanalmente**: Sincroniza classificações de sistemas de gestão do Databricks

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm run start:dev        # Hot-reload

# Produção
pnpm run build            # Compilar TypeScript
pnpm run start:prod       # Executar versão compilada

# Testes
pnpm run test             # Unit tests
pnpm run test:e2e         # E2E tests
pnpm run test:cov         # Coverage

# Linting
pnpm run lint             # ESLint
pnpm run format           # Prettier
```

## 🔄 Migração do Flask

Esta API substitui completamente o backend Flask anterior (`/backend/app.py`), mantendo 100% de compatibilidade com os contratos da API existente. Todas as rotas, parâmetros e respostas são idênticas.

**Mudanças:**
- Flask → NestJS
- Python → TypeScript
- Arquitetura modular com injeção de dependências
- Type safety com TypeScript strict mode
- Validação automática com class-validator
- Logging estruturado
- Exception handling global

## 🧪 Testar Sincronização Databricks

### Endpoints de Teste (Desenvolvimento)

```bash
# 1. Testar conexão com Databricks
curl http://localhost:3333/api/test-sync/databricks-connection

# 2. Verificar tabelas no Databricks (contagem + sample)
curl http://localhost:3333/api/test-sync/databricks-tables

# 3. Verificar status do DuckDB local
curl http://localhost:3333/api/test-sync/duckdb-status

# 4. Comparar dados Databricks vs DuckDB
curl http://localhost:3333/api/test-sync/compare

# 5. Sincronizar apenas 10 normas como teste
curl -X POST http://localhost:3333/api/test-sync/sync-sample
```

### Fluxo de Teste Recomendado

```bash
# Passo 1: Verificar credenciais Databricks
curl http://localhost:3333/api/test-sync/databricks-connection
# ✅ Deve retornar: {"success": true, "message": "Connected to Databricks successfully"}

# Passo 2: Ver quantas normas existem no Databricks
curl http://localhost:3333/api/test-sync/databricks-tables
# ✅ Deve mostrar total de normas e sample de 5 registros

# Passo 3: Ver quantas normas existem no DuckDB local
curl http://localhost:3333/api/test-sync/duckdb-status
# ✅ Deve mostrar total local (809,984 se já copiado)

# Passo 4: Sincronizar 10 normas de teste
curl -X POST http://localhost:3333/api/test-sync/sync-sample
# ✅ Deve retornar: {"success": true, "synced": 10}

# Passo 5: Comparar totais
curl http://localhost:3333/api/test-sync/compare
# ✅ Mostra diferença entre Databricks e DuckDB local
```

### Sincronização Completa (Produção)

```bash
# Sincronizar todas as normas (pode demorar)
curl -X POST http://localhost:3333/api/azure-sync/normas \
  -H "Authorization: Bearer <seu_token_admin>"

# Sincronizar classificações
curl -X POST http://localhost:3333/api/azure-sync/classifications \
  -H "Authorization: Bearer <seu_token_admin>"

# Sincronizar tudo
curl -X POST http://localhost:3333/api/azure-sync/all \
  -H "Authorization: Bearer <seu_token_admin>"
```

## 📊 Banco de Dados

### DuckDB Databases

1. **tb_normas_consolidadas.db** (809.984 registros)
   - Tabela principal: `tb_normas_consolidadas`
   - Tabelas auxiliares: `tb_usuarios`, `tb_normas_aprovacoes`

2. **management_systems_classifications.db** (31.120 registros)
   - Tabela: `tb_management_systems_classifications`
   - 59 classificações ativas (classification=true)

## 🐛 Debug

### Logs

Os logs são exibidos no console com o formato:

```
[Bootstrap] 🚀 Application is running on: http://localhost:5000/api
[HTTP] GET /api/normas 200 - 45ms
[DatabaseService] Connected to main database: ./data/tb_normas_consolidadas.db
```

### Erros Comuns

**DuckDB Connection Error:**
- Verifique se os arquivos `.db` existem em `./data/`
- Verifique permissões de leitura/escrita

**JWT Unauthorized:**
- Token expirado (7 dias padrão)
- Faça login novamente em `/api/auth/login`

**Databricks Sync Failure:**
- Verifique `DATABRICKS_SERVER_HOSTNAME`, `DATABRICKS_HTTP_PATH` e `DATABRICKS_ACCESS_TOKEN` no `.env`
- Teste conectividade com Databricks SQL Warehouse
- Verifique se as tabelas existem: `data_workspace.unificado.tb_normas_consolidadas` e `data_workspace.models.management_systems_classifications`

## 📝 Notas de Desenvolvimento

- TypeScript em modo `strict` - null safety obrigatório
- Class-validator para DTOs - validação automática
- Guards para proteção de rotas (JWT, Admin)
- Global exception filter para respostas consistentes
- Logging interceptor para todas requisições
- CORS habilitado para `localhost:5173` e `localhost:3000`

## 🚢 Deploy

O frontend já está configurado para apontar para `http://localhost:3333/api`. Basta executar:

1. Backend NestJS: `pnpm run start:dev` (porta 3333)
2. Frontend React: `pnpm run dev` (porta 5173)

Para produção, configure o `VITE_API_URL` no frontend para o endereço do servidor NestJS.

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs da aplicação
2. Teste o endpoint `/api/health`
3. Revise a documentação de cada módulo
