# Migração Flask → NestJS - Resumo das Alterações

## 📋 Arquivos Criados

### API (NestJS)
- ✅ `api/Dockerfile` - Dockerfile otimizado para NestJS
- ✅ `api/.dockerignore` - Arquivos a ignorar no build Docker
- ✅ `api/.env.docker` - Variáveis de ambiente para Docker

### Documentação
- ✅ `MIGRATION_SUMMARY.md` - Este arquivo

## 🔄 Arquivos Modificados

### Docker Compose
- ✅ `docker-compose.yml` - Atualizado para usar API NestJS
  - Backend Flask → API NestJS
  - Porta 4000 → 5001
  - Container `normas-backend` → `normas-api`
  
- ✅ `docker-compose.prod.yml` - Atualizado para produção
  - Backend Flask → API NestJS
  - Porta 4000 → 5001
  - URL da API: `http://10.10.2.25:5001`

### Scripts e Documentação
- ✅ `prepare_deploy.sh` - Atualizado para:
  - Excluir pastas `backend`, `backend-nest` e `api/data`
  - Incluir apenas a pasta `api` (NestJS)
  
- ✅ `DEPLOY_README.md` - Atualizado para refletir:
  - Mudança de Flask para NestJS
  - Nova porta (5001)
  - Novos endpoints e health checks
  - Instruções de configuração do `.env.docker`
  - Credenciais padrão de login
  - Troubleshooting atualizado

## 🗑️ Arquivos/Pastas que podem ser removidos

Após validar que tudo funciona, você pode remover:
- `backend/` - Código Flask antigo
- `backend-nest/` - Código de teste

## 🔧 Configuração Necessária

### Antes de fazer deploy

1. **Editar `api/.env.docker`** com as credenciais reais:
   ```env
   DATABRICKS_SERVER_HOSTNAME=seu-workspace.cloud.databricks.com
   DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/seu-warehouse-id
   DATABRICKS_ACCESS_TOKEN=seu-token
   JWT_SECRET=gere-um-secret-seguro-aqui
   ```

2. **Verificar caminhos dos bancos** no `docker-compose.prod.yml`:
   - Certifique-se que a pasta `database/` existe com os arquivos:
     - `tb_normas_consolidadas.db`
     - `management_systems_classifications.db`

## 🚀 Como testar localmente

### 1. Testar a API diretamente

```bash
cd api
pnpm install
pnpm start:dev
```

Acesse: http://localhost:5001/health

### 2. Testar com Docker Compose

```bash
# Usar o docker-compose local
docker-compose up -d --build

# Ver logs
docker-compose logs -f api

# Testar health check
curl http://localhost:5001/health
```

### 3. Acessar a aplicação

- Frontend: http://localhost:3000
- API: http://localhost:5001
- Health: http://localhost:5001/health

**Login padrão:**
- Email: admin@ambipar.com
- Senha: admin123

## 📦 Preparar Deploy

```bash
# Executar o script de preparação
./prepare_deploy.sh
```

Isso irá:
1. Copiar todos os arquivos necessários
2. Incluir os bancos de dados
3. Usar o `docker-compose.prod.yml` como `docker-compose.yml`
4. Criar um ZIP pronto para deploy

## 🔍 Principais Diferenças

| Aspecto | Flask (Antigo) | NestJS (Novo) |
|---------|---------------|---------------|
| Linguagem | Python | TypeScript/Node.js |
| Porta | 4000 (proxy para 5000) | 5001 |
| Container | `normas-backend` | `normas-api` |
| Pasta | `backend/` | `api/` |
| Health Check | `/health` | `/health` |
| Autenticação | Flask | JWT + Passport |

## ✅ Checklist de Deploy

- [ ] Editar `api/.env.docker` com credenciais reais
- [ ] Mudar `JWT_SECRET` para um valor seguro
- [ ] Verificar que os bancos DuckDB estão no local correto
- [ ] Testar localmente com Docker Compose
- [ ] Executar `./prepare_deploy.sh`
- [ ] Testar o ZIP gerado em ambiente de homologação
- [ ] Fazer backup dos bancos de dados
- [ ] Deploy em produção
- [ ] Alterar senha do admin após primeiro login

## 🆘 Troubleshooting

### API não inicia

```bash
# Ver logs detalhados
docker-compose logs -f api

# Verificar se a porta está livre
lsof -i :5001

# Reiniciar containers
docker-compose restart api
```

### Erro de conexão com Databricks

- Verificar credenciais no `.env.docker`
- Testar conexão manualmente via endpoint de teste
- Verificar firewall/rede

### Frontend não consegue conectar na API

- Verificar URL no build do frontend (docker-compose)
- Confirmar que a API está rodando: `curl http://localhost:5001/health`
- Ver logs do frontend: `docker-compose logs -f frontend`

## 📚 Documentação Adicional

- `api/README.md` - Documentação completa da API
- `DEPLOY_README.md` - Instruções de deploy
- `NEST_API_SPECIFICATION.md` - Especificação da API

## 🎯 Próximos Passos

1. ✅ Testar localmente
2. ✅ Validar todos os endpoints
3. ✅ Testar integração com Databricks
4. ✅ Preparar deploy
5. ✅ Deploy em homologação
6. ✅ Testes de aceitação
7. ✅ Deploy em produção
8. ✅ Remover código Flask antigo

---

**Data da migração:** 02/12/2025
**Versão da API:** 1.0.0
**Status:** ✅ Pronto para deploy
