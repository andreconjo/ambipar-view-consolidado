import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NormasService } from './normas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AprovacoesService } from '../aprovacoes/aprovacoes.service';
import { RegistrarAprovacaoDto } from '../aprovacoes/dto/aprovacao.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { NormasFilterParams } from './dto/norma.dto';

@Controller('normas')
@UseGuards(JwtAuthGuard)
export class NormasController {
  constructor(
    private normasService: NormasService,
    private aprovacoesService: AprovacoesService,
  ) {}

  @Get()
  findAll(@Query() filters: NormasFilterParams) {
    return this.normasService.findAll(filters);
  }

  @Get('filtros/valores')
  getFiltrosValores() {
    return this.normasService.getFiltrosValores();
  }

  @Get('aplicaveis')
  findAplicaveis(@Query() filters: NormasFilterParams) {
    return this.normasService.findAplicaveis(filters);
  }

  @Get('stats')
  getStats() {
    return this.normasService.getStats();
  }

  @Post('sync-aplicavel')
  syncAplicavel() {
    return this.normasService.syncAplicavel();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.normasService.findOne(id);
  }

  @Post()
  create(@Body() normaData: any) {
    return this.normasService.create(normaData);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() normaData: any,
  ) {
    return this.normasService.update(id, normaData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.normasService.remove(id);
  }

  @Get(':id/management-systems')
  getManagementSystems(@Param('id', ParseIntPipe) id: number) {
    return this.normasService.findOneWithManagementSystems(id);
  }

  @Post(':id/aprovacao')
  registrarAprovacao(
    @Param('id', ParseIntPipe) normaId: number,
    @Body() registrarAprovacaoDto: RegistrarAprovacaoDto,
    @CurrentUser() user: any,
  ) {
    return this.aprovacoesService.registrarAprovacao(
      normaId,
      registrarAprovacaoDto,
      user,
    );
  }

  @Get(':id/aprovacao')
  getHistoricoAprovacao(@Param('id', ParseIntPipe) normaId: number) {
    return this.aprovacoesService.getHistoricoByNorma(normaId);
  }

  @Get(':id/aprovacao/status')
  getStatusAprovacao(@Param('id', ParseIntPipe) normaId: number) {
    return this.aprovacoesService.getUltimoStatus(normaId);
  }
}
