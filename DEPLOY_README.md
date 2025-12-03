# Deploy - View Consolidado

## 📦 Conteúdo do pacote

Este pacote contém:
- Backend Flask (API)
- Frontend React (interface web)
- Banco de dados DuckDB (em `/database/local_dev.db`)
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
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## ⚙️ Configuração

### Alterar portas

Edite o arquivo `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "SUA_PORTA:5000"  # Ex: "8000:5000"
  
  frontend:
    ports:
      - "SUA_PORTA:80"    # Ex: "8080:80"
```

### Usar banco de dados externo

Se quiser usar um banco de dados diferente, altere o volume no `docker-compose.yml`:

```yaml
services:
  backend:
    volumes:
      - /caminho/para/seu/banco:/data
```

## 📊 Gerenciamento

### Ver logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

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

### Banco de dados não encontrado

Verifique se o arquivo `database/local_dev.db` existe no diretório.

### Erros de conexão

Verifique os logs:
```bash
docker-compose logs backend
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
