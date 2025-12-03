import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.log(`Validating user: ${username}`);
    const users = await this.databaseService.queryUsuarios(
      'SELECT id, username, password_hash, nome_completo, tipo_usuario, ativo FROM tb_usuarios WHERE username = ?',
      [username],
    );

    this.logger.log(`Users found: ${users.length}`);
    const user = users[0];

    if (!user) {
      this.logger.warn(`User not found: ${username}`);
      return null;
    }
    
    this.logger.log(`Checking password for user: ${username}`);

    if (!user.ativo) {
      throw new UnauthorizedException('User is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user.id };
    const token = this.jwtService.sign(payload);

    this.logger.log(`User ${user.username} logged in successfully`);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        nome_completo: user.nome_completo,
        tipo_usuario: user.tipo_usuario,
      },
    };
  }

  async getProfile(userId: number) {
    const users = await this.databaseService.queryUsuarios(
      'SELECT id, username, nome_completo, tipo_usuario, ativo FROM tb_usuarios WHERE id = ?',
      [userId],
    );

    if (!users || users.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return users[0];
  }
}
