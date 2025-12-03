import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface CrawlerFilters {
  pais?: string;
  estado?: string;
  cidade?: string;
  prioridade?: number;
  search?: string;
}

@Injectable()
export class CrawlersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(filters: CrawlerFilters = {}) {
    let sql = `
      SELECT 
        id,
        fonte,
        periodicidade,
        pais,
        estado,
        cidade,
        prioridade,
        usuario_id,
        data_criacao,
        data_atualizacao,
        ativo
      FROM default.tb_crawlers_manual
      WHERE ativo = true
    `;

    const conditions: string[] = [];

    if (filters.pais) {
      conditions.push(`pais = '${filters.pais.replace(/'/g, "''")}'`);
    }

    if (filters.estado) {
      conditions.push(`estado = '${filters.estado.replace(/'/g, "''")}'`);
    }

    if (filters.cidade) {
      conditions.push(`cidade = '${filters.cidade.replace(/'/g, "''")}'`);
    }

    if (filters.prioridade !== undefined) {
      conditions.push(`prioridade = ${filters.prioridade}`);
    }

    if (filters.search) {
      const searchTerm = filters.search.replace(/'/g, "''");
      conditions.push(
        `(LOWER(fonte) LIKE LOWER('%${searchTerm}%') OR LOWER(cidade) LIKE LOWER('%${searchTerm}%') OR LOWER(estado) LIKE LOWER('%${searchTerm}%'))`,
      );
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY prioridade DESC, pais, estado, cidade, fonte`;

    const rows = await this.databaseService.queryCrawlersManual(sql);
    return rows;
  }

  async getStats() {
    const totalSql = 'SELECT COUNT(*) as total FROM default.tb_crawlers_manual WHERE ativo = true';
    const totalRows = await this.databaseService.queryCrawlersManual(totalSql);

    const porPrioridadeSql = `
      SELECT prioridade, COUNT(*) as total 
      FROM default.tb_crawlers_manual 
      WHERE ativo = true
      GROUP BY prioridade 
      ORDER BY prioridade DESC
    `;
    const porPrioridade = await this.databaseService.queryCrawlersManual(porPrioridadeSql);

    const porEstadoSql = `
      SELECT estado, COUNT(*) as total 
      FROM default.tb_crawlers_manual 
      WHERE ativo = true AND pais = 'Brasil'
      GROUP BY estado 
      ORDER BY total DESC 
      LIMIT 10
    `;
    const porEstado = await this.databaseService.queryCrawlersManual(porEstadoSql);

    return {
      total: totalRows[0]?.total || 0,
      porPrioridade,
      porEstado,
    };
  }

  async getFiltrosValores() {
    const paisesSql = 'SELECT DISTINCT pais FROM default.tb_crawlers_manual WHERE ativo = true AND pais IS NOT NULL ORDER BY pais';
    const paises = await this.databaseService.queryCrawlersManual(paisesSql);

    const estadosSql = 'SELECT DISTINCT estado FROM default.tb_crawlers_manual WHERE ativo = true AND estado IS NOT NULL ORDER BY estado';
    const estados = await this.databaseService.queryCrawlersManual(estadosSql);

    const cidadesSql = 'SELECT DISTINCT cidade FROM default.tb_crawlers_manual WHERE ativo = true AND cidade IS NOT NULL ORDER BY cidade';
    const cidades = await this.databaseService.queryCrawlersManual(cidadesSql);

    return {
      paises: paises.map((r: any) => r.pais),
      estados: estados.map((r: any) => r.estado),
      cidades: cidades.map((r: any) => r.cidade),
      prioridades: [0, 1, 2, 3, 4, 5],
    };
  }

  async updatePrioridade(id: number, prioridade: number, usuarioId: number) {
    const sql = `
      UPDATE default.tb_crawlers_manual 
      SET prioridade = ${prioridade}, 
          usuario_id = ${usuarioId},
          data_atualizacao = CURRENT_TIMESTAMP()
      WHERE id = ${id}
    `;

    await this.databaseService.executeCrawlersManual(sql);

    return { success: true, message: 'Prioridade atualizada com sucesso' };
  }

  async updateBulkPrioridade(ids: number[], prioridade: number, usuarioId: number) {
    if (!ids || ids.length === 0) {
      return { success: false, message: 'Nenhum ID fornecido' };
    }

    const sql = `
      UPDATE default.tb_crawlers_manual 
      SET prioridade = ${prioridade}, 
          usuario_id = ${usuarioId},
          data_atualizacao = CURRENT_TIMESTAMP()
      WHERE id IN (${ids.join(',')})
    `;

    await this.databaseService.executeCrawlersManual(sql);

    return {
      success: true,
      message: `${ids.length} crawler(s) atualizado(s) com sucesso`,
    };
  }
}
