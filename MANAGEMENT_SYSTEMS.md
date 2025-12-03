# API - Sistemas de Gestão

## 📊 Novos Endpoints

A API agora trabalha com dois bancos de dados:
1. **local_dev.db** - Normas consolidadas
2. **management_systems_classifications.db** - Classificações de sistemas de gestão

## 🔗 Endpoints de Sistemas de Gestão

### GET /management-systems
Lista todos os sistemas de gestão únicos com total de normas classificadas.

**Resposta:**
```json
[
  { "sistema": "ISO 14001", "total": 150 },
  { "sistema": "ISO 9001", "total": 120 }
]
```

### GET /management-systems/:norm_id
Retorna todas as classificações de uma norma específica.

**Parâmetros:**
- `norm_id` - ID da norma

**Resposta:**
```json
[
  {
    "id": 1,
    "mngm_sys": "ISO 14001",
    "norm_id": 123,
    "classification_injection": "2025-11-12T10:00:00",
    "dst": 0.85,
    "hst": 0.78,
    "description_score": 0.82,
    "historical_score": 0.75,
    "classification": true,
    "historical_norm_id": "LEI-123"
  }
]
```

### GET /analytics/management-systems
Retorna estatísticas agregadas por sistema de gestão.

**Resposta:**
```json
[
  {
    "sistema": "ISO 14001",
    "total": 150,
    "classificadas": 120,
    "avg_dst": 0.756,
    "avg_hst": 0.682
  }
]
```

### GET /normas/:id/management-systems
Retorna uma norma completa com suas classificações de sistemas de gestão.

**Parâmetros:**
- `id` - ID da norma

**Resposta:**
```json
{
  "id": 123,
  "numero_norma": "LEI 1234/2024",
  "tipo_norma": "Lei",
  "titulo_da_norma": "Lei Ambiental...",
  "ementa": "Dispõe sobre...",
  ...outros campos da norma...,
  "management_systems_classifications": [
    {
      "id": 1,
      "mngm_sys": "ISO 14001",
      "norm_id": 123,
      "dst": 0.85,
      "hst": 0.78,
      "classification": true
    }
  ]
}
```

## 📈 Campos da Classificação

- **mngm_sys** - Nome do sistema de gestão (ISO 14001, ISO 9001, etc)
- **norm_id** - ID da norma relacionada
- **classification_injection** - Data/hora da classificação
- **dst** - Distance score (pontuação de distância)
- **hst** - Historical score (pontuação histórica)
- **description_score** - Pontuação baseada na descrição
- **historical_score** - Pontuação baseada no histórico
- **classification** - Booleano indicando se foi classificada
- **historical_norm_id** - ID histórico da norma

## 🗄️ Estrutura de Dados

### Banco 1: tb_normas_consolidadas
Contém todas as normas legislativas consolidadas.

### Banco 2: management_systems_classifications
Contém as classificações de normas por sistemas de gestão (ISO, OHSAS, etc).

## 🔄 Relação entre Bancos

As tabelas se relacionam através do campo `norm_id` da tabela `management_systems_classifications` que corresponde ao `id` da tabela `tb_normas_consolidadas`.

## 🐳 Docker

O docker-compose está configurado para montar ambos os bancos de dados:

```yaml
volumes:
  - ./database:/data
environment:
  - DB_PATH=/data/local_dev.db
  - DB_MANAGEMENT_PATH=/data/management_systems_classifications.db
```

## 📦 Deploy

O script `prepare_deploy.sh` agora copia ambos os bancos de dados para o pacote de deploy:
- `database/local_dev.db`
- `database/management_systems_classifications.db`
