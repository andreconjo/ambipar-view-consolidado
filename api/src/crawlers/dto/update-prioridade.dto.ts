import { IsInt, Min, Max } from 'class-validator';

export class UpdatePrioridadeDto {
  @IsInt()
  @Min(0)
  @Max(5)
  prioridade: number;
}
