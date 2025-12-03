import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'ambipar-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    const users = await this.databaseService.queryUsuarios(
      'SELECT id, username, nome_completo, tipo_usuario, ativo FROM tb_usuarios WHERE id = ?',
      [payload.sub],
    );

    const user = users[0];

    if (!user || !user.ativo) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      username: user.username,
      nome_completo: user.nome_completo,
      tipo_usuario: user.tipo_usuario,
    };
  }
}
