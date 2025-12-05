import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaginationResponse } from '../common/interfaces/pagination.interface';
import { Norma, NormasFilterParams } from './dto/norma.dto';

@Injectable()
export class NormasService {
  constructor(private databaseService: DatabaseService) {}

  async findAll(
    filters: NormasFilterParams,
  ): Promise<PaginationResponse<Norma>> {
    const page = filters.page || 1;
    const per_page = Math.min(filters.per_page || 50, 100);
    const offset = (page - 1) * per_page;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.tipo_norma) {
      conditions.push('n.tipo_norma = ?');
      params.push(filters.tipo_norma);
    }

    if (filters.status_vigencia) {
      conditions.push('n.status_vigencia = ?');
      params.push(filters.status_vigencia);
    }

    if (filters.divisao_politica) {
      conditions.push('n.divisao_politica = ?');
      params.push(filters.divisao_politica);
    }

    if (filters.origem_publicacao) {
      conditions.push('n.origem_publicacao = ?');
      params.push(filters.origem_publicacao);
    }

    if (filters.origem_dado) {
      conditions.push('n.origem_dado = ?');
      params.push(filters.origem_dado);
    }

    if (filters.aplicavel) {
      const aplicavelBool = filters.aplicavel === 'true';
      conditions.push('n.aplicavel = ?');
      params.push(aplicavelBool);
    }

    if (filters.status_aprovacao) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM tb_normas_aprovacoes a 
          WHERE a.norma_id = n.id 
          AND a.status = ?
          ORDER BY a.data_registro DESC 
          LIMIT 1
        )`
      );
      params.push(filters.status_aprovacao);
    }

    if (filters.search) {
      conditions.push('(n.ementa ILIKE ? OR n.numero_norma ILIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM tb_normas_consolidadas n ${whereClause}`;
    const countResult = await this.databaseService.queryNormas(countQuery, params);
    const total = Number(countResult[0].total);

    // Query com subquery para buscar último status de aprovação (como no Flask)
    const dataQuery = `
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
      ${whereClause}
      ORDER BY 
        CASE WHEN n.data_publicacao IS NULL THEN 1 ELSE 0 END,
        n.data_publicacao DESC,
        n.id DESC
      LIMIT ? OFFSET ?
    `;

    const data = await this.databaseService.queryNormas<Norma>(dataQuery, [
      ...params,
      per_page,
      offset,
    ]);

    return {
      data,
      pagination: {
        page,
        per_page,
        total,
        pages: Math.ceil(total / per_page),
      },
    };
  }

  async findOne(id: number): Promise<Norma> {
    const normas = await this.databaseService.queryNormas<Norma>(
      'SELECT * FROM tb_normas_consolidadas WHERE id = ?',
      [id],
    );

    if (normas.length === 0) {
      throw new NotFoundException(`Norma com ID ${id} não encontrada`);
    }

    return normas[0];
  }

  async getFiltrosValores() {
    const [
      tipoNorma,
      statusVigencia,
      divisaoPolitica,
      origemPublicacao,
      origemDado,
    ] = await Promise.all([
      this.databaseService.queryNormas(
        'SELECT DISTINCT tipo_norma FROM tb_normas_consolidadas WHERE tipo_norma IS NOT NULL ORDER BY tipo_norma',
      ),
      this.databaseService.queryNormas(
        'SELECT DISTINCT status_vigencia FROM tb_normas_consolidadas WHERE status_vigencia IS NOT NULL ORDER BY status_vigencia',
      ),
      this.databaseService.queryNormas(
        'SELECT DISTINCT divisao_politica FROM tb_normas_consolidadas WHERE divisao_politica IS NOT NULL ORDER BY divisao_politica',
      ),
      this.databaseService.queryNormas(
        'SELECT DISTINCT origem_publicacao FROM tb_normas_consolidadas WHERE origem_publicacao IS NOT NULL ORDER BY origem_publicacao',
      ),
      this.databaseService.queryNormas(
        'SELECT DISTINCT origem_dado FROM tb_normas_consolidadas WHERE origem_dado IS NOT NULL ORDER BY origem_dado',
      ),
    ]);

    return {
      tipo_norma: tipoNorma.map((r: any) => r.tipo_norma),
      status_vigencia: statusVigencia.map((r: any) => r.status_vigencia),
      divisao_politica: divisaoPolitica.map((r: any) => r.divisao_politica),
      origem_publicacao: origemPublicacao.map((r: any) => r.origem_publicacao),
      origem_dado: origemDado.map((r: any) => r.origem_dado),
    };
  }

  async syncAplicavel(): Promise<{ message: string; updated: number }> {
    // Resetar todas para false e NULL primeiro (igual ao Flask)
    await this.databaseService.executeNormas(
      'UPDATE tb_normas_consolidadas SET aplicavel = false, sistema_gestao = NULL',
      []
    );

    // Buscar normas com classification = true e seus sistemas de gestão (usando norm_id e mngm_sys como no Flask)
    const classificadas = await this.databaseService.queryManagement(`
      SELECT norm_id, mngm_sys
      FROM management_systems_classifications
      WHERE classification = true
    `);

    if (!classificadas || classificadas.length === 0) {
      return {
        message: 'Nenhuma norma classificada encontrada',
        updated: 0,
      };
    }

    // Agrupar sistemas de gestão por norma (caso uma norma tenha múltiplos sistemas)
    const normasSistemas: Record<number, string[]> = {};
    for (const row of classificadas) {
      const normId = row.norm_id;
      const mngmSys = row.mngm_sys;
      
      if (!normasSistemas[normId]) {
        normasSistemas[normId] = [];
      }
      if (mngmSys && !normasSistemas[normId].includes(mngmSys)) {
        normasSistemas[normId].push(mngmSys);
      }
    }

    // Atualizar normas em lote usando CASE WHEN para performance otimizada
    if (Object.keys(normasSistemas).length > 0) {
      const normIds = Object.keys(normasSistemas).map(Number);
      
      // Construir CASE WHEN para sistema_gestao
      const caseWhenParts = Object.entries(normasSistemas).map(([normId, sistemas]) => {
        const sistemasStr = sistemas.length > 0 ? sistemas.join(', ') : null;
        return sistemasStr 
          ? `WHEN ${normId} THEN '${sistemasStr.replace(/'/g, "''")}'`
          : `WHEN ${normId} THEN NULL`;
      });

      const updateSql = `
        UPDATE tb_normas_consolidadas 
        SET aplicavel = true,
            sistema_gestao = CASE id
              ${caseWhenParts.join('\n              ')}
            END
        WHERE id IN (${normIds.join(',')})
      `;

      await this.databaseService.executeNormas(updateSql, []);
    }

    const result = await this.databaseService.queryNormas(
      'SELECT COUNT(*) as count FROM tb_normas_consolidadas WHERE aplicavel = true',
    );

    return {
      message: 'Sincronização concluída com sucesso',
      updated: Number(result[0].count),
    };
  }

  async findAplicaveis(
    filters: NormasFilterParams,
  ): Promise<PaginationResponse<Norma>> {
    return this.findAll({ ...filters, aplicavel: 'true' });
  }

  async getStats() {
    const totalNormas = await this.databaseService.queryNormas(
      'SELECT COUNT(*) as count FROM tb_normas_consolidadas',
    );

    const porTipo = await this.databaseService.queryNormas(
      `SELECT tipo_norma, COUNT(*) as count 
       FROM tb_normas_consolidadas 
       WHERE tipo_norma IS NOT NULL
       GROUP BY tipo_norma 
       ORDER BY count DESC`,
    );

    const porOrgao = await this.databaseService.queryNormas(
      `SELECT orgao_emissor, COUNT(*) as count 
       FROM tb_normas_consolidadas 
       WHERE orgao_emissor IS NOT NULL
       GROUP BY orgao_emissor 
       ORDER BY count DESC 
       LIMIT 10`,
    );

    const porStatus = await this.databaseService.queryNormas(
      `SELECT status_vigencia, COUNT(*) as count 
       FROM tb_normas_consolidadas 
       WHERE status_vigencia IS NOT NULL
       GROUP BY status_vigencia`,
    );

    return {
      total_normas: Number(totalNormas[0].count),
      por_tipo: porTipo.map(r => ({...r, count: Number(r.count)})),
      por_orgao: porOrgao.map(r => ({...r, count: Number(r.count)})),
      por_status: porStatus.map(r => ({...r, count: Number(r.count)})),
    };
  }

  async findOneWithManagementSystems(id: number) {
    const norma = await this.findOne(id);

    const classifications = await this.databaseService.queryManagement(
      `SELECT *
       FROM management_systems_classifications
       WHERE norm_id = ?
       ORDER BY classification_injection DESC`,
      [id],
    );

    return {
      ...norma,
      management_systems_classifications: classifications,
    };
  }

  async create(normaData: any): Promise<{ message: string; id: number }> {
    // Definir origem_dado como "SITE" se não fornecido (igual ao Flask)
    if (!normaData.origem_dado) {
      normaData.origem_dado = 'SITE';
    }

    // Converter strings vazias em NULL para campos de data e numéricos
    const cleanedData = { ...normaData };
    Object.keys(cleanedData).forEach((key) => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });

    const columns = Object.keys(cleanedData);
    const values = Object.values(cleanedData);
    const placeholders = columns.map(() => '?').join(', ');

    await this.databaseService.executeNormas(
      `INSERT INTO tb_normas_consolidadas (${columns.join(', ')})
       VALUES (${placeholders})`,
      values,
    );

    // Buscar o ID inserido
    const result = await this.databaseService.queryNormas(
      'SELECT MAX(id) as id FROM tb_normas_consolidadas',
    );
    const newId = result[0].id;

    return {
      message: 'Norma criada com sucesso',
      id: newId,
    };
  }

  async update(
    id: number,
    normaData: any,
  ): Promise<{ message: string }> {
    // Verificar se a norma existe
    await this.findOne(id);

    // Converter strings vazias em NULL
    const cleanedData = { ...normaData };
    Object.keys(cleanedData).forEach((key) => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });

    const updates = Object.keys(cleanedData)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(cleanedData), id];

    await this.databaseService.executeNormas(
      `UPDATE tb_normas_consolidadas
       SET ${updates}
       WHERE id = ?`,
      values,
    );

    return { message: 'Norma atualizada com sucesso' };
  }

  async remove(id: number): Promise<{ message: string }> {
    // Verificar se a norma existe
    await this.findOne(id);

    await this.databaseService.executeNormas(
      'DELETE FROM tb_normas_consolidadas WHERE id = ?',
      [id],
    );

    return { message: 'Norma removida com sucesso' };
  }
}
