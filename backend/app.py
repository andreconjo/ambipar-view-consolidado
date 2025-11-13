from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import duckdb
from datetime import datetime, timedelta
from pathlib import Path
import os
import jwt
from functools import wraps

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv(
    "SECRET_KEY", "ambipar-secret-key-change-in-production"
)
CORS(app, supports_credentials=True)
bcrypt = Bcrypt(app)

# Caminhos para os bancos de dados
DB_PATH = os.getenv(
    "DB_PATH", "/Users/conjo/Documents/ambipar/db_consolidado/tb_normas_consolidadas.db"
)
DB_MANAGEMENT_PATH = os.getenv(
    "DB_MANAGEMENT_PATH",
    "/Users/conjo/Documents/ambipar/db_consolidado/management_systems_classifications.db",
)


def get_db_connection():
    """Cria uma conexão com o banco DuckDB principal (normas)"""
    return duckdb.connect(DB_PATH)


def get_management_db_connection():
    """Cria uma conexão com o banco DuckDB de classificações"""
    return duckdb.connect(DB_MANAGEMENT_PATH)


# ==================== AUTENTICAÇÃO ====================


def init_usuarios_table():
    """Cria a tabela de usuários se não existir"""
    conn = get_db_connection()
    try:
        # Criar sequence para IDs
        conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_usuarios START 1")

        # Criar tabela
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tb_usuarios (
                id INTEGER PRIMARY KEY,
                username VARCHAR NOT NULL UNIQUE,
                password_hash VARCHAR NOT NULL,
                nome_completo VARCHAR NOT NULL,
                tipo_usuario VARCHAR NOT NULL CHECK(tipo_usuario IN ('admin', 'user')),
                ativo BOOLEAN DEFAULT true,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Verificar se existe usuário admin
        result = conn.execute(
            "SELECT COUNT(*) FROM tb_usuarios WHERE tipo_usuario = 'admin'"
        ).fetchone()
        if result[0] == 0:
            # Criar usuário admin padrão (senha: admin123)
            password_hash = bcrypt.generate_password_hash("admin123").decode("utf-8")
            conn.execute(
                """
                INSERT INTO tb_usuarios (id, username, password_hash, nome_completo, tipo_usuario, ativo)
                VALUES (nextval('seq_usuarios'), 'conjo', ?, 'Conjo', '123', true)
            """,
                [password_hash],
            )
            print("✓ Usuário admin padrão criado (username: admin, senha: admin123)")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao inicializar tabela de usuários: {e}")
        conn.close()


def token_required(f):
    """Decorator para proteger rotas que exigem autenticação"""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"message": "Token não fornecido"}), 401

        try:
            # Remove 'Bearer ' do token
            if token.startswith("Bearer "):
                token = token[7:]

            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            current_user_id = data["user_id"]

            # Buscar usuário no banco
            conn = get_db_connection()
            user = conn.execute(
                "SELECT id, username, nome_completo, tipo_usuario, ativo FROM tb_usuarios WHERE id = ?",
                [current_user_id],
            ).fetchone()
            conn.close()

            if not user:
                return jsonify({"message": "Usuário não encontrado"}), 401

            if not user[4]:  # ativo
                return jsonify({"message": "Usuário inativo"}), 401

            # Adicionar informações do usuário ao request
            request.current_user = {
                "id": user[0],
                "username": user[1],
                "nome_completo": user[2],
                "tipo_usuario": user[3],
                "ativo": user[4],
            }

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token inválido"}), 401
        except Exception as e:
            return jsonify({"message": f"Erro na autenticação: {str(e)}"}), 401

        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator para proteger rotas que exigem permissão de admin"""

    @wraps(f)
    def decorated(*args, **kwargs):
        if (
            not hasattr(request, "current_user")
            or request.current_user["tipo_usuario"] != "admin"
        ):
            return (
                jsonify(
                    {"message": "Acesso negado. Requer permissão de administrador"}
                ),
                403,
            )
        return f(*args, **kwargs)

    return decorated


@app.route("/login", methods=["POST"])
def login():
    """POST /login - Autenticar usuário"""
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"message": "Username e senha são obrigatórios"}), 400

        conn = get_db_connection()
        user = conn.execute(
            "SELECT id, username, password_hash, nome_completo, tipo_usuario, ativo FROM tb_usuarios WHERE username = ?",
            [username],
        ).fetchone()
        conn.close()

        if not user:
            return jsonify({"message": "Credenciais inválidas"}), 401

        if not user[5]:  # ativo
            return jsonify({"message": "Usuário inativo"}), 401

        # Verificar senha
        if not bcrypt.check_password_hash(user[2], password):
            return jsonify({"message": "Credenciais inválidas"}), 401

        # Gerar token JWT
        token = jwt.encode(
            {"user_id": user[0], "exp": datetime.utcnow() + timedelta(days=7)},
            app.config["SECRET_KEY"],
            algorithm="HS256",
        )

        return (
            jsonify(
                {
                    "token": token,
                    "user": {
                        "id": user[0],
                        "username": user[1],
                        "nome_completo": user[3],
                        "tipo_usuario": user[4],
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/me", methods=["GET"])
@token_required
def get_current_user():
    """GET /me - Retorna informações do usuário logado"""
    return jsonify({"user": request.current_user}), 200


# ==================== ROTAS PÚBLICAS ====================


@app.route("/health", methods=["GET"])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "ok", "message": "API is running"})


@app.route("/normas", methods=["GET"])
@token_required
def get_normas():
    """
    GET /normas - Lista todas as normas com paginação e filtros (requer autenticação)
    Query params:
    - page: número da página (padrão: 1)
    - per_page: itens por página (padrão: 20)
    - tipo_norma: filtrar por tipo
    - orgao_emissor: filtrar por órgão
    - origem_publicacao: filtrar por origem do dado
    - search: busca em título, ementa ou número
    - status_aprovacao: filtrar por aprovado/recusado
    """
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
        tipo_norma = request.args.get("tipo_norma")
        orgao_emissor = request.args.get("orgao_emissor")
        origem_publicacao = request.args.get("origem_publicacao")
        origem_dado = request.args.get("origem_dado")
        status_vigencia = request.args.get("status_vigencia")
        divisao_politica = request.args.get("divisao_politica")
        search = request.args.get("search")
        aplicavel = request.args.get("aplicavel")
        status_aprovacao = request.args.get("status_aprovacao")

        offset = (page - 1) * per_page

        conn = get_db_connection()

        # Construir query com filtros
        where_clauses = []
        if tipo_norma:
            where_clauses.append(f"n.tipo_norma = '{tipo_norma}'")
        if orgao_emissor:
            where_clauses.append(f"n.orgao_emissor LIKE '%{orgao_emissor}%'")
        if origem_publicacao:
            where_clauses.append(f"n.origem_publicacao = '{origem_publicacao}'")
        if origem_dado:
            where_clauses.append(f"n.origem_dado = '{origem_dado}'")
        if status_vigencia:
            where_clauses.append(f"n.status_vigencia = '{status_vigencia}'")
        if divisao_politica:
            where_clauses.append(f"n.divisao_politica LIKE '%{divisao_politica}%'")
        if aplicavel:
            aplicavel_bool = aplicavel.lower() == "true"
            where_clauses.append(f"n.aplicavel = {aplicavel_bool}")
        if search:
            where_clauses.append(
                f"(n.titulo_da_norma LIKE '%{search}%' OR n.ementa LIKE '%{search}%' OR n.numero_norma LIKE '%{search}%')"
            )

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Query principal com subquery para pegar última aprovação
        query = f"""
            SELECT 
                n.*,
                (
                    SELECT status 
                    FROM tb_normas_aprovacoes 
                    WHERE norma_id = n.id 
                    ORDER BY data_registro DESC 
                    LIMIT 1
                ) as status_aprovacao
            FROM tb_normas_consolidadas n
            {where_sql}
            ORDER BY n.data_publicacao DESC
            LIMIT {per_page} OFFSET {offset}
        """

        result = conn.execute(query).fetchall()
        columns = [desc[0] for desc in conn.description]

        # Converter para lista de dicionários
        normas = [dict(zip(columns, row)) for row in result]

        # Filtrar por status_aprovacao se fornecido
        if status_aprovacao:
            normas = [
                n for n in normas if n.get("status_aprovacao") == status_aprovacao
            ]

        # Contar total
        count_query = f"SELECT COUNT(*) FROM tb_normas_consolidadas n {where_sql}"
        total = conn.execute(count_query).fetchone()[0]

        conn.close()

        return jsonify(
            {
                "data": normas,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page,
                },
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/<int:norma_id>", methods=["GET"])
@token_required
def get_norma(norma_id):
    """GET /normas/:id - Busca uma norma específica por ID (requer autenticação)"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            "SELECT * FROM tb_normas_consolidadas WHERE id = ?", [norma_id]
        ).fetchone()

        if not result:
            conn.close()
            return jsonify({"error": "Norma não encontrada"}), 404

        columns = [desc[0] for desc in conn.description]
        norma = dict(zip(columns, result))

        conn.close()

        return jsonify(norma)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas", methods=["POST"])
@token_required
def create_norma():
    """POST /normas - Cria uma nova norma (requer autenticação)"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400

        # Validar campos obrigatórios
        required_fields = [
            "numero_norma",
            "tipo_norma",
            "orgao_emissor",
            "titulo_da_norma",
        ]
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return (
                jsonify(
                    {
                        "error": "Campos obrigatórios faltando",
                        "missing_fields": missing_fields,
                    }
                ),
                400,
            )

        # Definir origem_dado como "SITE" se não fornecido
        if "origem_dado" not in data or not data["origem_dado"]:
            data["origem_dado"] = "SITE"

        conn = get_db_connection()

        # Inserir nova norma
        columns = list(data.keys())
        values = [data[col] for col in columns]
        placeholders = ", ".join(["?" for _ in values])

        query = f"""
            INSERT INTO tb_normas_consolidadas ({', '.join(columns)})
            VALUES ({placeholders})
        """

        conn.execute(query, values)

        # Buscar o ID inserido
        new_id = conn.execute("SELECT MAX(id) FROM tb_normas_consolidadas").fetchone()[
            0
        ]

        conn.close()

        return jsonify({"message": "Norma criada com sucesso", "id": new_id}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/<int:norma_id>", methods=["PUT"])
@token_required
def update_norma(norma_id):
    """PUT /normas/:id - Atualiza uma norma existente (requer autenticação)"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400

        conn = get_db_connection()

        # Verificar se a norma existe
        exists = conn.execute(
            "SELECT COUNT(*) FROM tb_normas_consolidadas WHERE id = ?", [norma_id]
        ).fetchone()[0]

        if not exists:
            conn.close()
            return jsonify({"error": "Norma não encontrada"}), 404

        # Construir UPDATE query
        set_clauses = [f"{key} = ?" for key in data.keys()]
        values = list(data.values())
        values.append(norma_id)

        query = f"""
            UPDATE tb_normas_consolidadas
            SET {', '.join(set_clauses)}, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        """

        conn.execute(query, values)
        conn.close()

        return jsonify({"message": "Norma atualizada com sucesso"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/<int:norma_id>", methods=["DELETE"])
@token_required
def delete_norma(norma_id):
    """DELETE /normas/:id - Remove uma norma (requer autenticação)"""
    try:
        conn = get_db_connection()

        # Verificar se a norma existe
        exists = conn.execute(
            "SELECT COUNT(*) FROM tb_normas_consolidadas WHERE id = ?", [norma_id]
        ).fetchone()[0]

        if not exists:
            conn.close()
            return jsonify({"error": "Norma não encontrada"}), 404

        conn.execute("DELETE FROM tb_normas_consolidadas WHERE id = ?", [norma_id])
        conn.close()

        return jsonify({"message": "Norma removida com sucesso"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/stats", methods=["GET"])
@token_required
def get_stats():
    """GET /normas/stats - Retorna estatísticas da base de dados (requer autenticação)"""
    try:
        conn = get_db_connection()

        stats = {
            "total_normas": conn.execute(
                "SELECT COUNT(*) FROM tb_normas_consolidadas"
            ).fetchone()[0],
            "por_tipo": conn.execute(
                """
                SELECT tipo_norma, COUNT(*) as count 
                FROM tb_normas_consolidadas 
                WHERE tipo_norma IS NOT NULL
                GROUP BY tipo_norma 
                ORDER BY count DESC
            """
            ).fetchall(),
            "por_orgao": conn.execute(
                """
                SELECT orgao_emissor, COUNT(*) as count 
                FROM tb_normas_consolidadas 
                WHERE orgao_emissor IS NOT NULL
                GROUP BY orgao_emissor 
                ORDER BY count DESC 
                LIMIT 10
            """
            ).fetchall(),
            "por_status": conn.execute(
                """
                SELECT status_vigencia, COUNT(*) as count 
                FROM tb_normas_consolidadas 
                WHERE status_vigencia IS NOT NULL
                GROUP BY status_vigencia
            """
            ).fetchall(),
        }

        conn.close()

        return jsonify(stats)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/filtros/valores", methods=["GET"])
@token_required
def get_filtros_valores():
    """GET /normas/filtros/valores - Retorna os valores distintos dos campos de filtro (requer autenticação)"""
    try:
        conn = get_db_connection()

        valores = {
            "tipo_norma": [
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT tipo_norma FROM tb_normas_consolidadas WHERE tipo_norma IS NOT NULL ORDER BY tipo_norma"
                ).fetchall()
            ],
            "divisao_politica": [
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT divisao_politica FROM tb_normas_consolidadas WHERE divisao_politica IS NOT NULL ORDER BY divisao_politica"
                ).fetchall()
            ],
            "status_vigencia": [
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT status_vigencia FROM tb_normas_consolidadas WHERE status_vigencia IS NOT NULL ORDER BY status_vigencia"
                ).fetchall()
            ],
            "origem_publicacao": [
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT origem_publicacao FROM tb_normas_consolidadas WHERE origem_publicacao IS NOT NULL ORDER BY origem_publicacao"
                ).fetchall()
            ],
            "origem_dado": [
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT origem_dado FROM tb_normas_consolidadas WHERE origem_dado IS NOT NULL ORDER BY origem_dado"
                ).fetchall()
            ],
        }

        conn.close()

        return jsonify(valores)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/origem", methods=["GET"])
@token_required
def get_analytics_origem():
    """GET /analytics/origem - Retorna quantidade de leis por origem de dado (requer autenticação)"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT origem_dado, COUNT(*) as total
            FROM tb_normas_consolidadas
            WHERE origem_dado IS NOT NULL
            GROUP BY origem_dado
            ORDER BY total DESC
        """
        ).fetchall()

        conn.close()

        data = [{"origem": row[0], "total": row[1]} for row in result]
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/origem-publicacao", methods=["GET"])
@token_required
def get_analytics_origem_publicacao():
    """GET /analytics/origem-publicacao - Retorna quantidade por origem de publicação (requer autenticação)"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT origem_publicacao, COUNT(*) as total
            FROM tb_normas_consolidadas
            WHERE origem_publicacao IS NOT NULL
            GROUP BY origem_publicacao
            ORDER BY total DESC
        """
        ).fetchall()

        conn.close()

        data = [{"origem": row[0], "total": row[1]} for row in result]
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/municipio", methods=["GET"])
@token_required
def get_analytics_municipio():
    """GET /analytics/municipio - Retorna quantidade por município (top 20) (requer autenticação)"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT divisao_politica, COUNT(*) as total
            FROM tb_normas_consolidadas
            WHERE divisao_politica IS NOT NULL
            GROUP BY divisao_politica
            ORDER BY total DESC
            LIMIT 20
        """
        ).fetchall()

        conn.close()

        data = [{"municipio": row[0], "total": row[1]} for row in result]
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/sincronizacao", methods=["GET"])
@token_required
def get_analytics_sincronizacao():
    """GET /analytics/sincronizacao - Retorna última data de ingestão por origem (requer autenticação)"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT origem_dado, MAX(lake_ingestao) as ultima_sinc
            FROM tb_normas_consolidadas
            WHERE origem_dado IS NOT NULL AND lake_ingestao IS NOT NULL
            GROUP BY origem_dado
            ORDER BY ultima_sinc DESC
        """
        ).fetchall()

        conn.close()

        data = [{"origem": row[0], "ultima_sincronizacao": row[1]} for row in result]
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/volume-dia", methods=["GET"])
@token_required
def get_analytics_volume_dia():
    """GET /analytics/volume-dia - Retorna volume de publicações por dia (últimos 90 dias) (requer autenticação)"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT 
                CAST(data_publicacao AS DATE) as dia,
                COUNT(*) as total
            FROM tb_normas_consolidadas
            WHERE data_publicacao IS NOT NULL
                AND data_publicacao >= CURRENT_DATE - INTERVAL 90 DAY
            GROUP BY CAST(data_publicacao AS DATE)
            ORDER BY dia ASC
        """
        ).fetchall()

        conn.close()

        data = [{"dia": str(row[0]), "total": row[1]} for row in result]
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/management-systems", methods=["GET"])
@token_required
def get_management_systems():
    """GET /management-systems - Lista todos os sistemas de gestão únicos (requer autenticação)"""
    try:
        conn = get_management_db_connection()

        result = conn.execute(
            """
            SELECT DISTINCT mngm_sys, COUNT(*) as total
            FROM management_systems_classifications
            WHERE mngm_sys IS NOT NULL
            GROUP BY mngm_sys
            ORDER BY total DESC
        """
        ).fetchall()

        conn.close()

        data = [{"sistema": row[0], "total": row[1]} for row in result]
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/management-systems/<int:norm_id>", methods=["GET"])
@token_required
def get_management_systems_by_norm(norm_id):
    """GET /management-systems/:norm_id - Retorna classificações de uma norma específica (requer autenticação)"""
    try:
        conn = get_management_db_connection()

        result = conn.execute(
            """
            SELECT *
            FROM management_systems_classifications
            WHERE norm_id = ?
            ORDER BY classification_injection DESC
        """,
            [norm_id],
        ).fetchall()

        if not result:
            conn.close()
            return jsonify([])

        columns = [desc[0] for desc in conn.description]
        classifications = [dict(zip(columns, row)) for row in result]

        conn.close()

        return jsonify(classifications)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics/management-systems", methods=["GET"])
@token_required
def get_analytics_management_systems():
    """GET /analytics/management-systems - Retorna estatísticas por sistema de gestão (requer autenticação)"""
    try:
        conn = get_management_db_connection()

        # Total por sistema de gestão
        result = conn.execute(
            """
            SELECT mngm_sys, 
                   COUNT(*) as total,
                   SUM(CASE WHEN classification = true THEN 1 ELSE 0 END) as classificadas,
                   AVG(dst) as avg_dst,
                   AVG(hst) as avg_hst
            FROM management_systems_classifications
            WHERE mngm_sys IS NOT NULL
            GROUP BY mngm_sys
            ORDER BY total DESC
        """
        ).fetchall()

        conn.close()

        data = [
            {
                "sistema": row[0],
                "total": row[1],
                "classificadas": row[2],
                "avg_dst": round(row[3], 3) if row[3] else 0,
                "avg_hst": round(row[4], 3) if row[4] else 0,
            }
            for row in result
        ]

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/<int:norma_id>/management-systems", methods=["GET"])
@token_required
def get_norma_with_management_systems(norma_id):
    """GET /normas/:id/management-systems - Retorna norma com suas classificações (requer autenticação)"""
    try:
        # Buscar norma
        conn_normas = get_db_connection()
        norma_result = conn_normas.execute(
            "SELECT * FROM tb_normas_consolidadas WHERE id = ?", [norma_id]
        ).fetchone()

        if not norma_result:
            conn_normas.close()
            return jsonify({"error": "Norma não encontrada"}), 404

        columns = [desc[0] for desc in conn_normas.description]
        norma = dict(zip(columns, norma_result))
        conn_normas.close()

        # Buscar classificações
        conn_mgmt = get_management_db_connection()
        classifications_result = conn_mgmt.execute(
            """
            SELECT *
            FROM management_systems_classifications
            WHERE norm_id = ?
            ORDER BY classification_injection DESC
        """,
            [norma_id],
        ).fetchall()

        if classifications_result:
            columns = [desc[0] for desc in conn_mgmt.description]
            classifications = [
                dict(zip(columns, row)) for row in classifications_result
            ]
        else:
            classifications = []

        conn_mgmt.close()

        norma["management_systems_classifications"] = classifications

        return jsonify(norma)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/sync-aplicavel", methods=["POST"])
@token_required
def sync_aplicavel():
    """
    POST /normas/sync-aplicavel - Sincroniza a flag 'aplicavel' baseada nas classificações (requer autenticação)

    Faz JOIN entre management_systems_classifications e tb_normas_consolidadas
    e marca como aplicável as normas que têm classification = true
    """
    try:
        conn_normas = get_db_connection()
        conn_mgmt = get_management_db_connection()

        # Verificar se coluna aplicavel existe, senão criar
        try:
            conn_normas.execute("SELECT aplicavel FROM tb_normas_consolidadas LIMIT 1")
        except:
            # Coluna não existe, criar
            conn_normas.execute(
                """
                ALTER TABLE tb_normas_consolidadas 
                ADD COLUMN aplicavel BOOLEAN DEFAULT false
            """
            )
            conn_normas.commit()

        # Resetar todas para false primeiro
        conn_normas.execute("UPDATE tb_normas_consolidadas SET aplicavel = false")

        # Buscar normas com classification = true
        classificadas = conn_mgmt.execute(
            """
            SELECT DISTINCT norm_id
            FROM management_systems_classifications
            WHERE classification = true
        """
        ).fetchall()

        # Extrair IDs
        norm_ids = [row[0] for row in classificadas]

        if not norm_ids:
            conn_normas.close()
            conn_mgmt.close()
            return jsonify(
                {
                    "message": "Nenhuma norma classificada encontrada",
                    "total_atualizadas": 0,
                }
            )

        # Atualizar normas para aplicavel = true
        placeholders = ",".join(["?" for _ in norm_ids])
        query = f"""
            UPDATE tb_normas_consolidadas 
            SET aplicavel = true 
            WHERE id IN ({placeholders})
        """
        conn_normas.execute(query, norm_ids)
        conn_normas.commit()

        total_atualizadas = len(norm_ids)

        conn_normas.close()
        conn_mgmt.close()

        return jsonify(
            {
                "message": "Sincronização concluída com sucesso",
                "total_atualizadas": total_atualizadas,
                "normas_ids": norm_ids[:100],  # Retorna apenas os primeiros 100 IDs
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/aplicaveis", methods=["GET"])
@token_required
def get_normas_aplicaveis():
    """
    GET /normas/aplicaveis - Lista normas marcadas como aplicáveis (requer autenticação)
    Query params: mesmos de GET /normas + filtro por aplicavel
    """
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))
        aplicavel_only = request.args.get("aplicavel", "true").lower() == "true"

        # Filtros adicionais
        tipo_norma = request.args.get("tipo_norma")
        search = request.args.get("search")

        offset = (page - 1) * per_page

        conn = get_db_connection()

        # Construir query com filtros
        where_clauses = []

        if aplicavel_only:
            where_clauses.append("aplicavel = true")

        if tipo_norma:
            where_clauses.append(f"tipo_norma = '{tipo_norma}'")

        if search:
            where_clauses.append(
                f"(titulo_da_norma LIKE '%{search}%' OR ementa LIKE '%{search}%' OR numero_norma LIKE '%{search}%')"
            )

        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Query principal
        query = f"""
            SELECT * FROM tb_normas_consolidadas
            {where_sql}
            ORDER BY data_publicacao DESC
            LIMIT {per_page} OFFSET {offset}
        """

        result = conn.execute(query).fetchall()
        columns = [desc[0] for desc in conn.description]

        # Converter para lista de dicionários
        normas = [dict(zip(columns, row)) for row in result]

        # Contar total
        count_query = f"SELECT COUNT(*) FROM tb_normas_consolidadas {where_sql}"
        total = conn.execute(count_query).fetchone()[0]

        conn.close()

        return jsonify(
            {
                "data": normas,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total,
                    "pages": (total + per_page - 1) // per_page,
                },
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def init_aprovacao_table():
    """Cria a tabela de aprovações se não existir"""
    try:
        conn = get_db_connection()

        # Criar sequence primeiro
        try:
            conn.execute("CREATE SEQUENCE seq_aprovacoes START 1")
        except:
            pass  # Sequence já existe

        # Criar tabela
        try:
            conn.execute(
                """
                CREATE TABLE tb_normas_aprovacoes (
                    id INTEGER DEFAULT nextval('seq_aprovacoes'),
                    norma_id INTEGER NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    solicitante VARCHAR(255) NOT NULL,
                    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    observacao TEXT
                )
            """
            )
        except:
            pass  # Tabela já existe

        conn.close()
    except Exception as e:
        print(f"Erro ao criar tabela de aprovações: {e}")


@app.route("/normas/<int:norma_id>/aprovacao", methods=["POST"])
@token_required
def registrar_aprovacao(norma_id):
    """
    POST /normas/:id/aprovacao - Registra aprovação ou recusa de uma norma (requer autenticação)
    Body: {
        "status": "aprovado" | "recusado",
        "observacao": "Observação opcional"
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400

        status = data.get("status")
        observacao = data.get("observacao", "")

        # Usar nome do usuário logado
        solicitante = request.current_user["nome_completo"]

        # Validações
        if not status or status not in ["aprovado", "recusado"]:
            return (
                jsonify({"error": "Status inválido. Use 'aprovado' ou 'recusado'"}),
                400,
            )

        conn = get_db_connection()

        # Verificar se a norma existe
        norma_exists = conn.execute(
            "SELECT COUNT(*) FROM tb_normas_consolidadas WHERE id = ?", [norma_id]
        ).fetchone()[0]

        if not norma_exists:
            conn.close()
            return jsonify({"error": "Norma não encontrada"}), 404

        # Inserir registro de aprovação
        conn.execute(
            """
            INSERT INTO tb_normas_aprovacoes (id, norma_id, status, solicitante, observacao, data_registro)
            VALUES (nextval('seq_aprovacoes'), ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
            [norma_id, status, solicitante.strip(), observacao],
        )

        # Buscar o registro inserido
        new_id = conn.execute("SELECT currval('seq_aprovacoes')").fetchone()[0]
        conn.commit()

        conn.close()

        return (
            jsonify(
                {
                    "message": f"Norma {status} com sucesso",
                    "id": new_id,
                    "norma_id": norma_id,
                    "status": status,
                    "solicitante": solicitante.strip(),
                }
            ),
            201,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/<int:norma_id>/aprovacao", methods=["GET"])
def get_historico_aprovacao(norma_id):
    """GET /normas/:id/aprovacao - Retorna histórico de aprovações de uma norma"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT * FROM tb_normas_aprovacoes
            WHERE norma_id = ?
            ORDER BY data_registro DESC
        """,
            [norma_id],
        ).fetchall()

        columns = [desc[0] for desc in conn.description]
        historico = [dict(zip(columns, row)) for row in result]

        conn.close()

        return jsonify(historico)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/normas/<int:norma_id>/aprovacao/status", methods=["GET"])
def get_status_aprovacao(norma_id):
    """GET /normas/:id/aprovacao/status - Retorna o último status de aprovação"""
    try:
        conn = get_db_connection()

        result = conn.execute(
            """
            SELECT status, solicitante, data_registro, observacao
            FROM tb_normas_aprovacoes
            WHERE norma_id = ?
            ORDER BY data_registro DESC
            LIMIT 1
        """,
            [norma_id],
        ).fetchone()

        conn.close()

        if not result:
            return jsonify({"status": None})

        return jsonify(
            {
                "status": result[0],
                "solicitante": result[1],
                "data_registro": result[2],
                "observacao": result[3],
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/aprovacoes/stats", methods=["GET"])
def get_aprovacoes_stats():
    """GET /aprovacoes/stats - Retorna estatísticas de aprovações"""
    try:
        conn = get_db_connection()

        stats = {
            "total_registros": conn.execute(
                "SELECT COUNT(*) FROM tb_normas_aprovacoes"
            ).fetchone()[0],
            "por_status": conn.execute(
                """
                SELECT status, COUNT(*) as count
                FROM tb_normas_aprovacoes
                GROUP BY status
            """
            ).fetchall(),
            "por_solicitante": conn.execute(
                """
                SELECT solicitante, COUNT(*) as count
                FROM tb_normas_aprovacoes
                GROUP BY solicitante
                ORDER BY count DESC
                LIMIT 10
            """
            ).fetchall(),
        }

        conn.close()

        return jsonify(stats)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== GERENCIAMENTO DE USUÁRIOS (ADMIN) ====================


@app.route("/usuarios", methods=["GET"])
@token_required
@admin_required
def get_usuarios():
    """GET /usuarios - Lista todos os usuários (apenas admin)"""
    try:
        conn = get_db_connection()
        usuarios = conn.execute(
            """
            SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao
            FROM tb_usuarios
            ORDER BY data_criacao DESC
        """
        ).fetchall()
        conn.close()

        return (
            jsonify(
                {
                    "usuarios": [
                        {
                            "id": u[0],
                            "username": u[1],
                            "nome_completo": u[2],
                            "tipo_usuario": u[3],
                            "ativo": u[4],
                            "data_criacao": u[5].isoformat() if u[5] else None,
                        }
                        for u in usuarios
                    ]
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/usuarios", methods=["POST"])
@token_required
@admin_required
def create_usuario():
    """POST /usuarios - Criar novo usuário (apenas admin)"""
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")
        nome_completo = data.get("nome_completo")
        tipo_usuario = data.get("tipo_usuario", "user")

        if not username or not password or not nome_completo:
            return (
                jsonify(
                    {"message": "Username, senha e nome completo são obrigatórios"}
                ),
                400,
            )

        if tipo_usuario not in ["admin", "user"]:
            return jsonify({"message": "Tipo de usuário inválido"}), 400

        # Verificar se username já existe
        conn = get_db_connection()
        existing = conn.execute(
            "SELECT id FROM tb_usuarios WHERE username = ?", [username]
        ).fetchone()

        if existing:
            conn.close()
            return jsonify({"message": "Username já existe"}), 400

        # Criar usuário
        password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        conn.execute(
            """
            INSERT INTO tb_usuarios (id, username, password_hash, nome_completo, tipo_usuario, ativo)
            VALUES (nextval('seq_usuarios'), ?, ?, ?, ?, true)
        """,
            [username, password_hash, nome_completo, tipo_usuario],
        )

        conn.commit()

        # Buscar usuário criado
        user = conn.execute(
            """
            SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao
            FROM tb_usuarios WHERE username = ?
        """,
            [username],
        ).fetchone()

        conn.close()

        return (
            jsonify(
                {
                    "message": "Usuário criado com sucesso",
                    "usuario": {
                        "id": user[0],
                        "username": user[1],
                        "nome_completo": user[2],
                        "tipo_usuario": user[3],
                        "ativo": user[4],
                        "data_criacao": user[5].isoformat() if user[5] else None,
                    },
                }
            ),
            201,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/usuarios/<int:user_id>", methods=["PUT"])
@token_required
@admin_required
def update_usuario(user_id):
    """PUT /usuarios/:id - Atualizar usuário (apenas admin)"""
    try:
        data = request.json
        conn = get_db_connection()

        # Verificar se usuário existe
        user = conn.execute(
            "SELECT id FROM tb_usuarios WHERE id = ?", [user_id]
        ).fetchone()
        if not user:
            conn.close()
            return jsonify({"message": "Usuário não encontrado"}), 404

        # Construir query de atualização
        updates = []
        params = []

        if "nome_completo" in data:
            updates.append("nome_completo = ?")
            params.append(data["nome_completo"])

        if "tipo_usuario" in data:
            if data["tipo_usuario"] not in ["admin", "user"]:
                conn.close()
                return jsonify({"message": "Tipo de usuário inválido"}), 400
            updates.append("tipo_usuario = ?")
            params.append(data["tipo_usuario"])

        if "ativo" in data:
            updates.append("ativo = ?")
            params.append(data["ativo"])

        if "password" in data and data["password"]:
            password_hash = bcrypt.generate_password_hash(data["password"]).decode(
                "utf-8"
            )
            updates.append("password_hash = ?")
            params.append(password_hash)

        if not updates:
            conn.close()
            return jsonify({"message": "Nenhum campo para atualizar"}), 400

        params.append(user_id)
        query = f"UPDATE tb_usuarios SET {', '.join(updates)} WHERE id = ?"

        conn.execute(query, params)
        conn.commit()

        # Buscar usuário atualizado
        updated_user = conn.execute(
            """
            SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao
            FROM tb_usuarios WHERE id = ?
        """,
            [user_id],
        ).fetchone()

        conn.close()

        return (
            jsonify(
                {
                    "message": "Usuário atualizado com sucesso",
                    "usuario": {
                        "id": updated_user[0],
                        "username": updated_user[1],
                        "nome_completo": updated_user[2],
                        "tipo_usuario": updated_user[3],
                        "ativo": updated_user[4],
                        "data_criacao": (
                            updated_user[5].isoformat() if updated_user[5] else None
                        ),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/usuarios/<int:user_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_usuario(user_id):
    """DELETE /usuarios/:id - Deletar usuário (apenas admin)"""
    try:
        # Não permitir deletar o próprio usuário
        if request.current_user["id"] == user_id:
            return (
                jsonify({"message": "Não é possível deletar seu próprio usuário"}),
                400,
            )

        conn = get_db_connection()

        # Verificar se usuário existe
        user = conn.execute(
            "SELECT id FROM tb_usuarios WHERE id = ?", [user_id]
        ).fetchone()
        if not user:
            conn.close()
            return jsonify({"message": "Usuário não encontrado"}), 404

        # Deletar usuário
        conn.execute("DELETE FROM tb_usuarios WHERE id = ?", [user_id])
        conn.commit()
        conn.close()

        return jsonify({"message": "Usuário deletado com sucesso"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/usuarios/<int:user_id>/aprovacoes", methods=["GET"])
@token_required
@admin_required
def get_usuario_aprovacoes(user_id):
    """GET /usuarios/:id/aprovacoes - Lista aprovações de um usuário (apenas admin)"""
    try:
        conn = get_db_connection()

        # Verificar se usuário existe
        user = conn.execute(
            "SELECT id, nome_completo FROM tb_usuarios WHERE id = ?", [user_id]
        ).fetchone()

        if not user:
            conn.close()
            return jsonify({"message": "Usuário não encontrado"}), 404

        # Buscar aprovações
        aprovacoes = conn.execute(
            """
            SELECT 
                a.id,
                a.norma_id,
                a.status,
                a.solicitante,
                a.data_registro,
                a.observacao,
                n.numero_norma,
                n.titulo_da_norma
            FROM tb_normas_aprovacoes a
            LEFT JOIN tb_normas_consolidadas n ON a.norma_id = n.id
            WHERE a.solicitante = ?
            ORDER BY a.data_registro DESC
        """,
            [user[1]],
        ).fetchall()  # Busca pelo nome_completo

        conn.close()

        return (
            jsonify(
                {
                    "usuario": {"id": user[0], "nome_completo": user[1]},
                    "aprovacoes": [
                        {
                            "id": a[0],
                            "norma_id": a[1],
                            "status": a[2],
                            "solicitante": a[3],
                            "data_registro": a[4].isoformat() if a[4] else None,
                            "observacao": a[5],
                            "numero_norma": a[6],
                            "titulo_da_norma": a[7],
                        }
                        for a in aprovacoes
                    ],
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Inicializar tabelas
    init_usuarios_table()
    init_aprovacao_table()
    app.run(host="0.0.0.0", debug=True, port=5001)
