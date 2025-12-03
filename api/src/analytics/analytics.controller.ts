import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('resumo')
  getResumoGeral() {
    return this.analyticsService.getResumoGeral();
  }

  @Get('municipio')
  getTopMunicipios() {
    return this.analyticsService.getTopMunicipios();
  }

  @Get('origem-publicacao')
  getOrigemPublicacao() {
    return this.analyticsService.getOrigemPublicacao();
  }

  @Get('normas-por-ano')
  getNormasPorAno() {
    return this.analyticsService.getNormasPorAno();
  }

  @Get('normas-por-tipo')
  getNormasPorTipo() {
    return this.analyticsService.getNormasPorTipo();
  }

  @Get('normas-por-status')
  getNormasPorStatus() {
    return this.analyticsService.getNormasPorStatus();
  }

  @Get('normas-por-origem')
  getNormasPorOrigem() {
    return this.analyticsService.getNormasPorOrigem();
  }

  @Get('aplicabilidade')
  getAplicabilidade() {
    return this.analyticsService.getAplicabilidade();
  }
}
