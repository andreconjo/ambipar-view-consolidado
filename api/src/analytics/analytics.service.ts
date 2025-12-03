import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private databaseService: DatabaseService) {}

  async getTopMunicipios() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        divisao_politica as municipio,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE divisao_politica IS NOT NULL 
        AND divisao_politica != ''
        AND divisao_politica != 'Brasil'
      GROUP BY divisao_politica
      ORDER BY total DESC
      LIMIT 20
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getOrigemPublicacao() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        origem_publicacao,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE origem_publicacao IS NOT NULL AND origem_publicacao != ''
      GROUP BY origem_publicacao
      ORDER BY total DESC
      LIMIT 20
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getNormasPorAno() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        YEAR(data_publicacao) as ano,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE data_publicacao IS NOT NULL
      GROUP BY YEAR(data_publicacao)
      ORDER BY YEAR(data_publicacao) DESC
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getNormasPorTipo() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        tipo_norma,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE tipo_norma IS NOT NULL AND tipo_norma != ''
      GROUP BY tipo_norma
      ORDER BY total DESC
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getNormasPorStatus() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        status_vigencia,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE status_vigencia IS NOT NULL AND status_vigencia != ''
      GROUP BY status_vigencia
      ORDER BY total DESC
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getNormasPorOrigem() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        origem_dado,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE origem_dado IS NOT NULL AND origem_dado != ''
      GROUP BY origem_dado
      ORDER BY total DESC
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getAplicabilidade() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        CASE 
          WHEN aplicavel = true THEN 'Aplicável'
          ELSE 'Não Aplicável'
        END as status,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      GROUP BY aplicavel
      ORDER BY total DESC
    `);
    return result.map(r => ({...r, total: Number(r.total)}));
  }

  async getResumoGeral() {
    const [
      totalNormas,
      totalAplicaveis,
      totalMunicipios,
      totalTiposNorma,
      totalOrigens,
    ] = await Promise.all([
      this.databaseService.queryNormas(
        'SELECT COUNT(*) as total FROM tb_normas_consolidadas',
      ),
      this.databaseService.queryNormas(
        'SELECT COUNT(*) as total FROM tb_normas_consolidadas WHERE aplicavel = true',
      ),
      this.databaseService.queryNormas(
        "SELECT COUNT(DISTINCT divisao_politica) as total FROM tb_normas_consolidadas WHERE divisao_politica IS NOT NULL AND divisao_politica != '' AND divisao_politica != 'Brasil'",
      ),
      this.databaseService.queryNormas(
        "SELECT COUNT(DISTINCT tipo_norma) as total FROM tb_normas_consolidadas WHERE tipo_norma IS NOT NULL AND tipo_norma != ''",
      ),
      this.databaseService.queryNormas(
        "SELECT COUNT(DISTINCT origem_publicacao) as total FROM tb_normas_consolidadas WHERE origem_publicacao IS NOT NULL AND origem_publicacao != ''",
      ),
    ]);

    return {
      total_normas: Number(totalNormas[0].total),
      total_aplicaveis: Number(totalAplicaveis[0].total),
      total_municipios: Number(totalMunicipios[0].total),
      total_tipos_norma: Number(totalTiposNorma[0].total),
      total_origens: Number(totalOrigens[0].total),
    };
  }
}
