import {
  Controller,
  Get,
} from '@nestjs/common';
import { AprovacoesService } from './aprovacoes.service';

@Controller('aprovacoes')
export class AprovacoesController {
  constructor(private aprovacoesService: AprovacoesService) {}

  @Get('stats')
  getStats() {
    return this.aprovacoesService.getStats();
  }
}
