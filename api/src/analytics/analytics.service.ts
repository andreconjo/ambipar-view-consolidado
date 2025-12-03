import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private databaseService: DatabaseService) {}

  async getOrigemDado() {
    const result = await this.databaseService.queryNormas(`
      SELECT origem_dado as origem, COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE origem_dado IS NOT NULL
      GROUP BY origem_dado
      ORDER BY total DESC
    `);
    return result.map((r) => ({ origem: r.origem, total: Number(r.total) }));
  }

  async getOrigemPublicacao() {
    const result = await this.databaseService.queryNormas(`
      SELECT origem_publicacao as origem, COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE origem_publicacao IS NOT NULL
      GROUP BY origem_publicacao
      ORDER BY total DESC
    `);
    return result.map((r) => ({ origem: r.origem, total: Number(r.total) }));
  }

  async getMunicipio() {
    const result = await this.databaseService.queryNormas(`
      SELECT divisao_politica as municipio, COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE divisao_politica IS NOT NULL
      GROUP BY divisao_politica
      ORDER BY total DESC
      LIMIT 20
    `);
    return result.map((r) => ({
      municipio: r.municipio,
      total: Number(r.total),
    }));
  }

  async getSincronizacao() {
    const result = await this.databaseService.queryNormas(`
      SELECT origem_dado as origem, MAX(lake_ingestao) as ultima_sincronizacao
      FROM tb_normas_consolidadas
      WHERE origem_dado IS NOT NULL AND lake_ingestao IS NOT NULL
      GROUP BY origem_dado
      ORDER BY ultima_sincronizacao DESC
    `);
    return result.map((r) => ({
      origem: r.origem,
      ultima_sincronizacao: r.ultima_sincronizacao,
    }));
  }

  async getVolumeDia() {
    const result = await this.databaseService.queryNormas(`
      SELECT 
        CAST(data_publicacao AS DATE) as dia,
        COUNT(*) as total
      FROM tb_normas_consolidadas
      WHERE data_publicacao IS NOT NULL
        AND data_publicacao >= CURRENT_DATE - INTERVAL 90 DAY
      GROUP BY CAST(data_publicacao AS DATE)
      ORDER BY dia ASC
    `);
    return result.map((r) => ({
      dia: r.dia ? r.dia.toString() : null,
      total: Number(r.total),
    }));
  }

  async getManagementSystems() {
    const result = await this.databaseService.queryManagement(`
      SELECT mngm_sys as sistema, 
             COUNT(*) as total,
             SUM(CASE WHEN classification = true THEN 1 ELSE 0 END) as classificadas,
             AVG(dst) as avg_dst,
             AVG(hst) as avg_hst
      FROM management_systems_classifications
      WHERE mngm_sys IS NOT NULL
      GROUP BY mngm_sys
      ORDER BY total DESC
    `);
    return result.map((r: any) => ({
      sistema: r.sistema,
      total: Number(r.total),
      classificadas: Number(r.classificadas),
      avg_dst: r.avg_dst ? Math.round(Number(r.avg_dst) * 1000) / 1000 : 0,
      avg_hst: r.avg_hst ? Math.round(Number(r.avg_hst) * 1000) / 1000 : 0,
    }));
  }
}
