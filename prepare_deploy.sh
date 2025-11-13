#!/bin/bash

# Script para preparar deploy - cria cópia limpa e compacta

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Preparando deploy...${NC}"

# Diretório base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="${BASE_DIR}/deploy_temp"
ZIP_NAME="view_consolidado_deploy_$(date +%Y%m%d_%H%M%S).zip"
DB_PATH="/Users/conjo/Documents/ambipar/db_consolidado/tb_normas_consolidadas.db"
DB_MANAGEMENT_PATH="/Users/conjo/Documents/ambipar/db_consolidado/management_systems_classifications.db"

# Limpar diretório temporário se existir
if [ -d "$TEMP_DIR" ]; then
    echo -e "${YELLOW}⚠️  Removendo diretório temporário anterior...${NC}"
    rm -rf "$TEMP_DIR"
fi

# Criar diretório temporário
echo -e "${GREEN}📁 Criando diretório temporário...${NC}"
mkdir -p "$TEMP_DIR/view_consolidado"

# Copiar arquivos excluindo pastas desnecessárias
echo -e "${GREEN}📋 Copiando arquivos do projeto...${NC}"
rsync -av --progress \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='dist' \
    --exclude='.cache' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='deploy_temp' \
    --exclude='*.zip' \
    --exclude='docker-compose.yml' \
    "${BASE_DIR}/" "${TEMP_DIR}/view_consolidado/"

# Copiar docker-compose para produção (renomeando .prod para final)
echo -e "${GREEN}📋 Usando docker-compose de produção...${NC}"
cp "${BASE_DIR}/docker-compose.prod.yml" "${TEMP_DIR}/view_consolidado/docker-compose.yml"
echo -e "${YELLOW}ℹ️  O arquivo docker-compose.prod.yml será usado como docker-compose.yml no deploy${NC}"

# Copiar README de deploy
echo -e "${GREEN}📋 Copiando instruções de deploy...${NC}"
cp "${BASE_DIR}/DEPLOY_README.md" "${TEMP_DIR}/view_consolidado/README.md"

# Copiar banco de dados principal
if [ -f "$DB_PATH" ]; then
    echo -e "${GREEN}💾 Copiando banco de dados principal...${NC}"
    mkdir -p "${TEMP_DIR}/view_consolidado/database"
    cp "$DB_PATH" "${TEMP_DIR}/view_consolidado/database/tb_normas_consolidadas.db"
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    echo -e "${GREEN}✅ Banco de dados principal copiado (${DB_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠️  Banco de dados principal não encontrado em: ${DB_PATH}${NC}"
fi

# Copiar banco de dados de classificações
if [ -f "$DB_MANAGEMENT_PATH" ]; then
    echo -e "${GREEN}💾 Copiando banco de dados de classificações...${NC}"
    cp "$DB_MANAGEMENT_PATH" "${TEMP_DIR}/view_consolidado/database/management_systems_classifications.db"
    DB_MGMT_SIZE=$(du -h "$DB_MANAGEMENT_PATH" | cut -f1)
    echo -e "${GREEN}✅ Banco de dados de classificações copiado (${DB_MGMT_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠️  Banco de dados de classificações não encontrado em: ${DB_MANAGEMENT_PATH}${NC}"
fi

# Ir para o diretório temporário
cd "$TEMP_DIR"

# Compactar
echo -e "${GREEN}📦 Compactando arquivos...${NC}"
zip -r "${BASE_DIR}/${ZIP_NAME}" view_consolidado/ -q

# Limpar
echo -e "${GREEN}🧹 Limpando arquivos temporários...${NC}"
cd "$BASE_DIR"
rm -rf "$TEMP_DIR"

# Obter tamanho do arquivo
ZIP_SIZE=$(du -h "${ZIP_NAME}" | cut -f1)

echo -e "${GREEN}✅ Deploy preparado com sucesso!${NC}"
echo -e "${GREEN}📦 Arquivo: ${NC}${ZIP_NAME}"
echo -e "${GREEN}📊 Tamanho: ${NC}${ZIP_SIZE}"
echo -e "${YELLOW}📍 Localização: ${NC}${BASE_DIR}/${ZIP_NAME}"
