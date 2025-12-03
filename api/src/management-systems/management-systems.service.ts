import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ManagementSystemsService {
  constructor(private databaseService: DatabaseService) {}

  async getClassifications() {
    return this.databaseService.queryManagement(`
      SELECT 
        numero_norma,
        sistema_gestao,
        classification,
        data_classificacao
      FROM tb_management_systems_classifications
      WHERE classification = true
      ORDER BY sistema_gestao, numero_norma
    `);
  }

  async getClassificationsByNorma(numeroNorma: string) {
    return this.databaseService.queryManagement(
      `SELECT 
        numero_norma,
        sistema_gestao,
        classification,
        data_classificacao
       FROM tb_management_systems_classifications
       WHERE numero_norma = ? AND classification = true`,
      [numeroNorma],
    );
  }

  async getClassificationsBySistema(sistemaGestao: string) {
    return this.databaseService.queryManagement(
      `SELECT 
        numero_norma,
        sistema_gestao,
        classification,
        data_classificacao
       FROM tb_management_systems_classifications
       WHERE sistema_gestao = ? AND classification = true
       ORDER BY numero_norma`,
      [sistemaGestao],
    );
  }

  async getSistemasList() {
    return this.databaseService.queryManagement(`
      SELECT 
        sistema_gestao,
        COUNT(*) as total_normas
      FROM tb_management_systems_classifications
      WHERE classification = true
      GROUP BY sistema_gestao
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
          'SELECT COUNT(DISTINCT sistema_gestao) as total FROM tb_management_systems_classifications WHERE classification = true',
        ),
        this.databaseService.queryManagement(
          'SELECT COUNT(DISTINCT numero_norma) as total FROM tb_management_systems_classifications WHERE classification = true',
        ),
      ]);

    return {
      total_classifications: totalClassifications[0].total,
      total_sistemas: totalSistemas[0].total,
      total_normas: totalNormas[0].total,
    };
  }
}
