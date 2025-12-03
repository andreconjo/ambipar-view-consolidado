# Migração de Tabelas para Azure Databricks

Este script cria as tabelas necessárias no Azure Databricks para centralizar os dados de usuários e aprovações.

## Pré-requisitos

- Node.js instalado
- Credenciais do Azure Databricks configuradas no `.env`
- Pacote `@databricks/sql` instalado

## Como executar

```bash
# 1. Navegar para o diretório da API
cd api

# 2. Instalar dependência (se ainda não instalou)
pnpm add @databricks/sql

# 3. Executar o script de migração
node scripts/create-azure-tables.js
```

## O que o script faz

1. **Conecta ao Azure Databricks** usando as credenciais do `.env`
2. **Cria a tabela `tb_usuarios`** com os campos:
   - id (BIGINT, PRIMARY KEY)
   - username (STRING, UNIQUE)
   - password_hash (STRING)
   - nome_completo (STRING)
   - tipo_usuario (STRING)
   - ativo (BOOLEAN)
   - data_criacao (TIMESTAMP)

3. **Cria a tabela `tb_normas_aprovacoes`** com os campos:
   - id (BIGINT, PRIMARY KEY)
   - norma_id (BIGINT)
   - status (STRING)
   - solicitante (STRING)
   - data_registro (TIMESTAMP)
   - observacao (STRING)

4. **Cria usuário admin padrão** (se não existir):
   - Username: `conjo`
   - Password: `admin123`
   - Tipo: `admin`

## Tabelas criadas

Todas as tabelas usam formato **DELTA** para melhor performance e transações ACID.

## Verificação

Após executar, o script mostrará:
- ✓ Confirmação de criação de cada tabela
- ✓ Status do usuário admin
- 📊 Lista de todas as tabelas criadas

## Troubleshooting

Se encontrar erro de conexão:
1. Verifique as credenciais no `.env`
2. Confirme que o warehouse está ativo no Databricks
3. Verifique permissões de acesso

## Próximos passos

Após executar com sucesso:
1. As queries de usuários e aprovações usarão automaticamente o Azure
2. Não é mais necessário manter bancos locais para esses dados
3. Reinicie a aplicação NestJS para aplicar as mudanças
