import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('origem')
  getOrigemDado() {
    return this.analyticsService.getOrigemDado();
  }

  @Get('origem-publicacao')
  getOrigemPublicacao() {
    return this.analyticsService.getOrigemPublicacao();
  }

  @Get('municipio')
  getMunicipio() {
    return this.analyticsService.getMunicipio();
  }

  @Get('sincronizacao')
  getSincronizacao() {
    return this.analyticsService.getSincronizacao();
  }

  @Get('volume-dia')
  getVolumeDia() {
    return this.analyticsService.getVolumeDia();
  }

  @Get('management-systems')
  getManagementSystems() {
    return this.analyticsService.getManagementSystems();
  }
}
