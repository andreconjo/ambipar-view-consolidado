import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ManagementSystemsService } from './management-systems.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('management-systems')
@UseGuards(JwtAuthGuard)
export class ManagementSystemsController {
  constructor(
    private managementSystemsService: ManagementSystemsService,
  ) {}

  @Get('classifications')
  getClassifications() {
    return this.managementSystemsService.getClassifications();
  }

  @Get('classifications/norma/:numeroNorma')
  getClassificationsByNorma(@Param('numeroNorma') numeroNorma: string) {
    return this.managementSystemsService.getClassificationsByNorma(
      numeroNorma,
    );
  }

  @Get('classifications/sistema/:sistemaGestao')
  getClassificationsBySistema(@Param('sistemaGestao') sistemaGestao: string) {
    return this.managementSystemsService.getClassificationsBySistema(
      sistemaGestao,
    );
  }

  @Get('sistemas')
  getSistemasList() {
    return this.managementSystemsService.getSistemasList();
  }

  @Get('stats')
  getStats() {
    return this.managementSystemsService.getStats();
  }
}
