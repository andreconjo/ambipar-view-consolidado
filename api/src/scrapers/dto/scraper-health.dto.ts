import { IsString, IsNumber, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class CreateScraperHealthDto {
  @IsString()
  @IsNotEmpty()
  service: string;

  @IsNumber()
  @IsOptional()
  total_registros?: number;

  @IsNumber()
  @IsOptional()
  execution_time?: number; // em segundos

  @IsString()
  @IsOptional()
  state?: string; // UF

  @IsString()
  @IsIn(['success', 'error', 'running'])
  status: string;

  @IsString()
  @IsOptional()
  error_message?: string;
}

export class ScraperHealthQueryDto {
  @IsString()
  @IsOptional()
  service?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  @IsIn(['success', 'error', 'running'])
  status?: string;

  @IsString()
  @IsOptional()
  startDate?: string; // ISO date

  @IsString()
  @IsOptional()
  endDate?: string; // ISO date

  @IsNumber()
  @IsOptional()
  limit?: number;
}
