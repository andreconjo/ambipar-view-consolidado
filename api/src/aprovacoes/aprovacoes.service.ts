import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAprovacaoDto, UpdateAprovacaoDto, RegistrarAprovacaoDto } from './dto/aprovacao.dto';

@Injectable()
export class AprovacoesService {
  constructor(private databaseService: DatabaseService) {}

  async findAll() {
    // Buscar aprovações do Azure
    const aprovacoes = await this.databaseService.queryAprovacoes(
      `SELECT * FROM tb_normas_aprovacoes ORDER BY data_registro DESC`,
    );

    // Buscar dados das normas do Azure Databricks
    const normasMap = new Map();
    if (aprovacoes.length > 0) {
      const normaIds = [...new Set(aprovacoes.map(a => a.norma_id))];
      const normas = await this.databaseService.queryNormas(
        `SELECT id, tipo_norma, numero_norma, ementa FROM tb_normas_consolidadas WHERE id IN (${normaIds.join(',')})`,
      );
      normas.forEach(n => normasMap.set(n.id, n));
    }

    // Combinar dados
    return aprovacoes.map(a => ({
      ...a,
      tipo_norma: normasMap.get(a.norma_id)?.tipo_norma || null,
      numero_norma: normasMap.get(a.norma_id)?.numero_norma || null,
      ementa: normasMap.get(a.norma_id)?.ementa || null,
    }));
  }

  async findOne(id: number) {
    const aprovacoes = await this.databaseService.queryAprovacoes(
      `SELECT * FROM tb_normas_aprovacoes WHERE id = ?`,
      [id],
    );

    if (aprovacoes.length === 0) {
      throw new NotFoundException(`Aprovação com ID ${id} não encontrada`);
    }

    const aprovacao = aprovacoes[0];

    // Buscar dados da norma do Azure Databricks
    const normas = await this.databaseService.queryNormas(
      `SELECT tipo_norma, numero_norma, ementa FROM tb_normas_consolidadas WHERE id = ?`,
      [aprovacao.norma_id],
    );

    return {
      ...aprovacao,
      tipo_norma: normas[0]?.tipo_norma || null,
      numero_norma: normas[0]?.numero_norma || null,
      ementa: normas[0]?.ementa || null,
    };
  }

  async create(createAprovacaoDto: CreateAprovacaoDto) {
    // Buscar próximo ID
    const maxIdResult = await this.databaseService.queryAprovacoes(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM tb_normas_aprovacoes',
    );
    const nextId = maxIdResult[0].next_id;

    await this.databaseService.executeAprovacoes(
      `INSERT INTO tb_normas_aprovacoes (id, norma_id, status, solicitante, observacao, data_registro) 
       VALUES (?, ?, ?, ?, ?, current_timestamp())`,
      [
        nextId,
        createAprovacaoDto.norma_id,
        createAprovacaoDto.status,
        createAprovacaoDto.solicitante,
        createAprovacaoDto.observacao || null,
      ],
    );

    // Buscar aprovação criada
    const newAprovacao = await this.databaseService.queryAprovacoes(
      `SELECT * FROM tb_normas_aprovacoes WHERE id = ?`,
      [nextId],
    );

    // Buscar dados da norma do Azure Databricks
    const normas = await this.databaseService.queryNormas(
      `SELECT tipo_norma, numero_norma, ementa FROM tb_normas_consolidadas WHERE id = ?`,
      [createAprovacaoDto.norma_id],
    );

    return {
      ...newAprovacao[0],
      tipo_norma: normas[0]?.tipo_norma || null,
      numero_norma: normas[0]?.numero_norma || null,
      ementa: normas[0]?.ementa || null,
    };
  }

  async update(id: number, updateAprovacaoDto: UpdateAprovacaoDto) {
    await this.findOne(id); // Verify exists

    const updates: string[] = [];
    const params: any[] = [];

    if (updateAprovacaoDto.status) {
      updates.push('status = ?');
      params.push(updateAprovacaoDto.status);
    }

    if (updateAprovacaoDto.observacao !== undefined) {
      updates.push('observacao = ?');
      params.push(updateAprovacaoDto.observacao);
    }

    if (updates.length > 0) {
      params.push(id);
      await this.databaseService.executeAprovacoes(
        `UPDATE tb_normas_aprovacoes SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id); // Verify exists
    await this.databaseService.executeAprovacoes(
      'DELETE FROM tb_normas_aprovacoes WHERE id = ?',
      [id],
    );
    return { message: 'Aprovação removida com sucesso' };
  }

  async registrarAprovacao(
    normaId: number,
    registrarAprovacaoDto: RegistrarAprovacaoDto,
    user: any,
  ) {
    // Verificar se a norma existe
    const normas = await this.databaseService.queryNormas(
      'SELECT COUNT(*) as count FROM tb_normas_consolidadas WHERE id = ?',
      [normaId],
    );

    if (Number(normas[0].count) === 0) {
      throw new NotFoundException('Norma não encontrada');
    }

    // Usar nome do usuário logado
    const solicitante = user.nome_completo;

    // Buscar próximo ID
    const maxIdResult = await this.databaseService.queryAprovacoes(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM tb_normas_aprovacoes',
    );
    const newId = maxIdResult[0].next_id;

    // Inserir registro de aprovação
    await this.databaseService.executeAprovacoes(
      `INSERT INTO tb_normas_aprovacoes (id, norma_id, status, solicitante, observacao, data_registro)
       VALUES (?, ?, ?, ?, ?, current_timestamp())`,
      [newId, normaId, registrarAprovacaoDto.status, solicitante, registrarAprovacaoDto.observacao || ''],
    );

    return {
      message: `Norma ${registrarAprovacaoDto.status} com sucesso`,
      id: newId,
      norma_id: normaId,
      status: registrarAprovacaoDto.status,
      solicitante,
    };
  }

  async getHistoricoByNorma(normaId: number) {
    return this.databaseService.queryAprovacoes(
      `SELECT * FROM tb_normas_aprovacoes
       WHERE norma_id = ?
       ORDER BY data_registro DESC`,
      [normaId],
    );
  }

  async getUltimoStatus(normaId: number) {
    const result = await this.databaseService.queryAprovacoes(
      `SELECT status, solicitante, data_registro, observacao
       FROM tb_normas_aprovacoes
       WHERE norma_id = ?
       ORDER BY data_registro DESC
       LIMIT 1`,
      [normaId],
    );

    if (result.length === 0) {
      return { status: null };
    }

    return result[0];
  }

  async getStats() {
    const totalRegistros = await this.databaseService.queryAprovacoes(
      'SELECT COUNT(*) as count FROM tb_normas_aprovacoes',
    );

    const porStatus = await this.databaseService.queryAprovacoes(
      `SELECT status, COUNT(*) as count
       FROM tb_normas_aprovacoes
       GROUP BY status`,
    );

    const porSolicitante = await this.databaseService.queryAprovacoes(
      `SELECT solicitante, COUNT(*) as count
       FROM tb_normas_aprovacoes
       GROUP BY solicitante
       ORDER BY count DESC
       LIMIT 10`,
    );

    return {
      total_registros: totalRegistros[0].count,
      por_status: porStatus,
      por_solicitante: porSolicitante,
    };
  }
}
