# Deploy - View Consolidado

## 📦 Conteúdo do pacote

Este pacote contém:
- API NestJS (Backend) - conecta ao Azure Databricks
- Frontend React (interface web)
- Docker Compose configurado para produção

## 🚀 Instalação rápida

### 1. Extrair o arquivo

```bash
unzip view_consolidado_deploy_*.zip
cd view_consolidado
```

### 2. Iniciar os containers

```bash
docker-compose up -d --build
```

### 3. Acessar a aplicação

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

### 4. Login inicial

Use as credenciais padrão:
- **Email**: admin@ambipar.com
- **Senha**: admin123

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro login!

## ⚙️ Configuração

### Alterar portas

Edite o arquivo `docker-compose.yml`:

```yaml
services:
  api:
    ports:
      - "SUA_PORTA:5001"  # Ex: "8001:5001"
  
  frontend:
    ports:
      - "SUA_PORTA:80"    # Ex: "8080:80"
```

### Configurar variáveis de ambiente

Edite o arquivo `api/.env.docker` para configurar:
- Credenciais do Azure Databricks (se necessário atualizar)
- JWT Secret (obrigatório mudar em produção)

```env
DATABRICKS_SERVER_HOSTNAME=seu-workspace.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/seu-warehouse-id
DATABRICKS_ACCESS_TOKEN=seu-token
JWT_SECRET=troque-por-um-secret-seguro
```

**Importante:** A API usa Azure Databricks como fonte de dados principal, não requer bancos de dados locais.

### Persistir cache local (opcional)

A API cria cache DuckDB local para melhor performance. Para persistir entre restarts:

```yaml
services:
  api:
    volumes:
      - ./api-data:/app/data
```

## 📊 Gerenciamento

### Ver logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas API
docker-compose logs -f api

# Apenas frontend
docker-compose logs -f frontend
```

### Parar os containers

```bash
docker-compose down
```

### Reiniciar

```bash
docker-compose restart
```

### Atualizar

```bash
docker-compose down
docker-compose up -d --build
```

## 🔍 Verificar status

```bash
docker-compose ps
```

## 🛠️ Solução de problemas

### Porta em uso

Se a porta já estiver em uso, altere no `docker-compose.yml` conforme descrito acima.

### Erros de conexão

Verifique os logs da API:
```bash
docker-compose logs api
```

### Problemas com Azure Databricks

Verifique as credenciais no arquivo `api/.env.docker`:
- DATABRICKS_SERVER_HOSTNAME
- DATABRICKS_HTTP_PATH
- DATABRICKS_ACCESS_TOKEN

### API não inicia

Possíveis causas:
1. Porta 5001 já em uso
2. Credenciais do Databricks inválidas
3. Problemas de rede com Azure

Verifique os logs detalhados:
```bash
docker-compose logs -f api
```

### Limpar tudo e recomeçar

```bash
docker-compose down -v
docker-compose up -d --build
```

## 📝 Requisitos

- Docker 20.10+
- Docker Compose 2.0+

## 🆘 Suporte

Para problemas ou dúvidas, verifique os logs detalhados dos containers.
