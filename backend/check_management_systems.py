#!/usr/bin/env python3
"""
Script para consultar sistemas de gestão classificados
"""
import duckdb
import os
from tabulate import tabulate

# Caminhos dos bancos
DB_PATH = os.getenv(
    "DB_PATH", "/Users/conjo/Documents/ambipar/db_consolidado/tb_normas_consolidadas.db"
)
DB_MANAGEMENT_PATH = os.getenv(
    "DB_MANAGEMENT_PATH",
    "/Users/conjo/Documents/ambipar/db_consolidado/management_systems_classifications.db",
)


def check_management_systems():
    """Consulta normas classificadas por sistema de gestão"""

    print("=" * 80)
    print("NORMAS CLASSIFICADAS POR SISTEMA DE GESTÃO")
    print("=" * 80)
    print()

    # Conectar aos dois bancos
    conn_normas = duckdb.connect(DB_PATH)
    conn_mgmt = duckdb.connect(DB_MANAGEMENT_PATH)

    # Primeiro, vamos ver o que tem na tabela de classificações
    print("📊 Estrutura da tabela management_systems_classifications:")
    print("-" * 80)

    try:
        schema = conn_mgmt.execute(
            "DESCRIBE management_systems_classifications"
        ).fetchall()

        print(
            tabulate(
                schema, headers=["Column", "Type", "Null", "Key", "Default", "Extra"]
            )
        )
        print()

        # Total de registros
        total = conn_mgmt.execute(
            "SELECT COUNT(*) FROM management_systems_classifications"
        ).fetchone()[0]
        print(f"📈 Total de registros: {total:,}")

        # Total com classification = true
        classificadas = conn_mgmt.execute(
            "SELECT COUNT(*) FROM management_systems_classifications WHERE classification = true"
        ).fetchone()[0]
        print(f"✅ Registros com classification = true: {classificadas:,}")
        print()

        # Sistemas de gestão únicos
        print("🔍 Sistemas de Gestão encontrados:")
        print("-" * 80)

        sistemas = conn_mgmt.execute(
            """
            SELECT 
                mngm_sys,
                COUNT(*) as total,
                SUM(CASE WHEN classification = true THEN 1 ELSE 0 END) as classificadas
            FROM management_systems_classifications
            WHERE mngm_sys IS NOT NULL
            GROUP BY mngm_sys
            ORDER BY classificadas DESC, total DESC
            """
        ).fetchall()

        print(
            tabulate(
                sistemas,
                headers=["Sistema de Gestão", "Total", "Classificadas"],
                tablefmt="grid",
            )
        )
        print()

        # Agora vamos buscar algumas normas classificadas com JOIN
        print("📋 Amostra de Normas Classificadas (primeiras 20):")
        print("-" * 80)

        # Buscar IDs das normas classificadas
        norm_ids = conn_mgmt.execute(
            """
            SELECT DISTINCT norm_id, mngm_sys
            FROM management_systems_classifications
            WHERE classification = true
            ORDER BY norm_id ASC
            LIMIT 20
            """
        ).fetchall()

        if not norm_ids:
            print("❌ Nenhuma norma classificada encontrada!")
            return

        # Buscar dados das normas
        resultados = []
        for norm_id, mngm_sys in norm_ids:
            norma = conn_normas.execute(
                """
                SELECT 
                    id,
                    numero_norma,
                    tipo_norma,
                    titulo_da_norma,
                    data_publicacao
                FROM tb_normas_consolidadas
                WHERE id = ?
                """,
                [norm_id],
            ).fetchone()

            if norma:
                resultados.append(
                    [
                        norma[0],  # id
                        mngm_sys,  # sistema
                        norma[1],  # numero_norma
                        norma[2],  # tipo_norma
                        (
                            norma[3][:50] + "..." if len(norma[3]) > 50 else norma[3]
                        ),  # titulo
                        norma[4],  # data_publicacao
                    ]
                )

        print(
            tabulate(
                resultados,
                headers=[
                    "ID",
                    "Sistema",
                    "Número",
                    "Tipo",
                    "Título",
                    "Data Publicação",
                ],
                tablefmt="grid",
            )
        )
        print()

        # Estatísticas por data
        print("📅 Distribuição por Ano:")
        print("-" * 80)

        anos = []
        for norm_id, _ in norm_ids[:100]:  # Limitar para não demorar muito
            norma = conn_normas.execute(
                "SELECT YEAR(data_publicacao) as ano FROM tb_normas_consolidadas WHERE id = ?",
                [norm_id],
            ).fetchone()
            if norma and norma[0]:
                anos.append(norma[0])

        if anos:
            from collections import Counter

            distribuicao = Counter(anos)

            dist_data = [[ano, count] for ano, count in sorted(distribuicao.items())]
            print(tabulate(dist_data, headers=["Ano", "Quantidade"], tablefmt="grid"))

    except Exception as e:
        print(f"❌ Erro ao executar consulta: {e}")
        import traceback

        traceback.print_exc()

    finally:
        conn_normas.close()
        conn_mgmt.close()

    print()
    print("=" * 80)
    print("✅ Consulta finalizada!")
    print("=" * 80)


if __name__ == "__main__":
    check_management_systems()
