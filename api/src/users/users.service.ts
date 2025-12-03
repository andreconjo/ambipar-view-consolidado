import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private databaseService: DatabaseService) {}

  async findAll() {
    return this.databaseService.queryUsuarios(
      `SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao 
       FROM tb_usuarios ORDER BY id`,
    );
  }

  async findOne(id: number) {
    const users = await this.databaseService.queryUsuarios(
      `SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao 
       FROM tb_usuarios WHERE id = ?`,
      [id],
    );

    if (users.length === 0) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return users[0];
  }

  async create(createUserDto: CreateUserDto) {
    const existing = await this.databaseService.queryUsuarios(
      'SELECT id FROM tb_usuarios WHERE username = ?',
      [createUserDto.username],
    );

    if (existing.length > 0) {
      throw new ConflictException('Nome de usuário já existe');
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
        createUserDto.tipo_usuario,
        createUserDto.ativo ?? true,
      ],
    );

    const newUser = await this.databaseService.queryUsuarios(
      `SELECT id, username, nome_completo, tipo_usuario, ativo, data_criacao 
       FROM tb_usuarios WHERE username = ?`,
      [createUserDto.username],
    );

    return newUser[0];
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
      updates.push('tipo_usuario = ?');
      params.push(updateUserDto.tipo_usuario);
    }

    if (updateUserDto.ativo !== undefined) {
      updates.push('ativo = ?');
      params.push(updateUserDto.ativo);
    }

    if (updates.length > 0) {
      params.push(id);
      await this.databaseService.executeUsuarios(
        `UPDATE tb_usuarios SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id); // Verify exists
    await this.databaseService.executeUsuarios(
      'DELETE FROM tb_usuarios WHERE id = ?',
      [id],
    );
    return { message: 'Usuário removido com sucesso' };
  }
}
