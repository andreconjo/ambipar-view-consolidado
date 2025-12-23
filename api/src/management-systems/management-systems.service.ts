import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ManagementSystemsService {
  constructor(private databaseService: DatabaseService) {}

  async getClassifications() {
    // Colunas do Databricks: norm_id, mngm_sys, classification, classification_injection
    return this.databaseService.queryManagement(`
      SELECT 
        norm_id as numero_norma,
        mngm_sys as sistema_gestao,
        classification,
        classification_injection as data_classificacao
      FROM tb_management_systems_classifications
      WHERE classification = true
      ORDER BY mngm_sys, norm_id
    `);
  }

  async getClassificationsByNorma(numeroNorma: string) {
    return this.databaseService.queryManagement(
      `SELECT 
        norm_id as numero_norma,
        mngm_sys as sistema_gestao,
        classification,
        classification_injection as data_classificacao
       FROM tb_management_systems_classifications
       WHERE norm_id = ? AND classification = true`,
      [numeroNorma],
    );
  }

  async getClassificationsBySistema(sistemaGestao: string) {
    return this.databaseService.queryManagement(
      `SELECT 
        norm_id as numero_norma,
        mngm_sys as sistema_gestao,
        classification,
        classification_injection as data_classificacao
       FROM tb_management_systems_classifications
       WHERE mngm_sys = ? AND classification = true
       ORDER BY norm_id`,
      [sistemaGestao],
    );
  }

  async getSistemasList() {
    return this.databaseService.queryManagement(`
      SELECT 
        mngm_sys as sistema_gestao,
        COUNT(*) as total_normas
      FROM tb_management_systems_classifications
      WHERE classification = true
      GROUP BY mngm_sys
      ORDER BY total_normas DESC
    `);
  }

  async getStats() {
    const [totalClassifications, totalSistemas, totalNormas] =
      await Promise.all([
        this.databaseService.queryManagement(
          'SELECT COUNT(*) as total FROM tb_management_systems_classifications WHERE classification = true',
        ),
        this.databaseService.queryManagement(
          'SELECT COUNT(DISTINCT mngm_sys) as total FROM tb_management_systems_classifications WHERE classification = true',
        ),
        this.databaseService.queryManagement(
          'SELECT COUNT(DISTINCT norm_id) as total FROM tb_management_systems_classifications WHERE classification = true',
        ),
      ]);

    return {
      total_classifications: totalClassifications[0].total,
      total_sistemas: totalSistemas[0].total,
      total_normas: totalNormas[0].total,
    };
  }
}
