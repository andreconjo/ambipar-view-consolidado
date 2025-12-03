import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsBoolean,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  nome_completo: string;

  @IsString()
  @IsIn(['admin', 'user'])
  tipo_usuario: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nome_completo?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  @IsIn(['admin', 'user'])
  tipo_usuario?: string;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
