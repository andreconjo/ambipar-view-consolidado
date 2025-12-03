import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private databaseService: DatabaseService) {}

  async findAll() {
    const usuarios = await this.databaseService.queryUsuarios(
      `SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao 
       FROM tb_usuarios ORDER BY data_criacao DESC`,
    );

    return usuarios.map((u) => ({
      id: u.id,
      username: u.username,
      nome_completo: u.nome_completo,
      tipo_usuario: u.tipo_usuario,
      ativo: u.ativo,
      data_criacao: u.data_criacao ? new Date(u.data_criacao).toISOString() : null,
    }));
  }

  async findOne(id: number) {
    const users = await this.databaseService.queryUsuarios(
      `SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao 
       FROM tb_usuarios WHERE id = ?`,
      [id],
    );

    if (users.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return users[0];
  }

  async create(createUserDto: CreateUserDto) {
    // Validar campos obrigatórios
    if (!createUserDto.username || !createUserDto.password || !createUserDto.nome_completo) {
      throw new BadRequestException('Username, senha e nome completo são obrigatórios');
    }

    // Validar tipo de usuário
    if (createUserDto.tipo_usuario && !['admin', 'user'].includes(createUserDto.tipo_usuario)) {
      throw new BadRequestException('Tipo de usuário inválido');
    }

    // Verificar se username já existe
    const existing = await this.databaseService.queryUsuarios(
      'SELECT id FROM tb_usuarios WHERE username = ?',
      [createUserDto.username],
    );

    if (existing.length > 0) {
      throw new ConflictException('Username já existe');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Buscar próximo ID
    const maxIdResult = await this.databaseService.queryUsuarios(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM tb_usuarios',
    );
    const nextId = maxIdResult[0].next_id;

    await this.databaseService.executeUsuarios(
      `INSERT INTO tb_usuarios (id, username, password_hash, nome_completo, tipo_usuario, ativo, data_criacao) 
       VALUES (?, ?, ?, ?, ?, ?, current_timestamp())`,
      [
        nextId,
        createUserDto.username,
        hashedPassword,
        createUserDto.nome_completo,
        createUserDto.tipo_usuario || 'user',
        createUserDto.ativo ?? true,
      ],
    );

    const newUser = await this.databaseService.queryUsuarios(
      `SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao 
       FROM tb_usuarios WHERE username = ?`,
      [createUserDto.username],
    );

    const user = newUser[0];
    return {
      id: user.id,
      username: user.username,
      nome_completo: user.nome_completo,
      tipo_usuario: user.tipo_usuario,
      ativo: user.ativo,
      data_criacao: user.data_criacao ? new Date(user.data_criacao).toISOString() : null,
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Verify exists

    const updates: string[] = [];
    const params: any[] = [];

    if (updateUserDto.nome_completo) {
      updates.push('nome_completo = ?');
      params.push(updateUserDto.nome_completo);
    }

    if (updateUserDto.password) {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      updates.push('password_hash = ?');
      params.push(hashedPassword);
    }

    if (updateUserDto.tipo_usuario) {
      if (!['admin', 'user'].includes(updateUserDto.tipo_usuario)) {
        throw new BadRequestException('Tipo de usuário inválido');
      }
      updates.push('tipo_usuario = ?');
      params.push(updateUserDto.tipo_usuario);
    }

    if (updateUserDto.ativo !== undefined) {
      updates.push('ativo = ?');
      params.push(updateUserDto.ativo);
    }

    if (updates.length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar');
    }

    params.push(id);
    await this.databaseService.executeUsuarios(
      `UPDATE tb_usuarios SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    const updatedUser = await this.findOne(id);
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      nome_completo: updatedUser.nome_completo,
      tipo_usuario: updatedUser.tipo_usuario,
      ativo: updatedUser.ativo,
      data_criacao: updatedUser.data_criacao
        ? new Date(updatedUser.data_criacao).toISOString()
        : null,
    };
  }

  async remove(id: number, currentUserId: number) {
    // Não permitir deletar o próprio usuário
    if (currentUserId === id) {
      throw new BadRequestException('Não é possível deletar seu próprio usuário');
    }

    await this.findOne(id); // Verify exists
    await this.databaseService.executeUsuarios('DELETE FROM tb_usuarios WHERE id = ?', [id]);
    return { message: 'Usuário deletado com sucesso' };
  }

  async getUserAprovacoes(id: number) {
    // Verificar se usuário existe e buscar nome completo
    const users = await this.databaseService.queryUsuarios(
      'SELECT id, nome_completo FROM tb_usuarios WHERE id = ?',
      [id],
    );

    if (users.length === 0) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const user = users[0];

    // Buscar aprovações pelo nome_completo (tabela tb_normas_aprovacoes está no schema default)
    const aprovacoes = await this.databaseService.queryAprovacoes(
      `SELECT 
        a.id,
        a.norma_id,
        a.status,
        a.solicitante,
        a.data_registro,
        a.observacao
      FROM tb_normas_aprovacoes a
      WHERE a.solicitante = ?
      ORDER BY a.data_registro DESC`,
      [user.nome_completo],
    );

    // Buscar informações das normas separadamente para cada aprovação
    const aprovacoesComNormas = await Promise.all(
      aprovacoes.map(async (a) => {
        let norma = null;
        try {
          const normas = await this.databaseService.queryNormas(
            `SELECT numero_norma, titulo_da_norma FROM tb_normas_consolidadas WHERE id = ?`,
            [a.norma_id],
          );
          norma = normas[0] || null;
        } catch (error) {
          // Se não encontrar a norma, continua sem ela
        }

        return {
          id: a.id,
          norma_id: a.norma_id,
          status: a.status,
          solicitante: a.solicitante,
          data_registro: a.data_registro ? new Date(a.data_registro).toISOString() : null,
          observacao: a.observacao,
          numero_norma: norma?.numero_norma || null,
          titulo_da_norma: norma?.titulo_da_norma || null,
        };
      }),
    );

    return {
      usuario: {
        id: user.id,
        nome_completo: user.nome_completo,
      },
      aprovacoes: aprovacoesComNormas,
    };
  }
}
