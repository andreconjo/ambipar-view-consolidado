import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateAprovacaoDto {
  @IsInt()
  norma_id: number;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  solicitante: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}

export class UpdateAprovacaoDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  observacao?: string;
}
