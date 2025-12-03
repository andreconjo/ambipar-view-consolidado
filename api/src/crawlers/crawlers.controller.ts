import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrawlersService } from './crawlers.service';
import { UpdatePrioridadeDto } from './dto/update-prioridade.dto';

@Controller('crawlers')
@UseGuards(JwtAuthGuard)
export class CrawlersController {
  constructor(private readonly crawlersService: CrawlersService) {}

  @Get()
  async findAll(
    @Query('pais') pais?: string,
    @Query('estado') estado?: string,
    @Query('cidade') cidade?: string,
    @Query('prioridade') prioridade?: string,
    @Query('search') search?: string,
  ) {
    return this.crawlersService.findAll({
      pais,
      estado,
      cidade,
      prioridade: prioridade ? parseInt(prioridade) : undefined,
      search,
    });
  }

  @Get('stats')
  async getStats() {
    return this.crawlersService.getStats();
  }

  @Get('filtros/valores')
  async getFiltrosValores() {
    return this.crawlersService.getFiltrosValores();
  }

  @Put(':id/prioridade')
  async updatePrioridade(
    @Param('id') id: string,
    @Body() updateDto: UpdatePrioridadeDto,
    @Request() req: any,
  ) {
    return this.crawlersService.updatePrioridade(
      parseInt(id),
      updateDto.prioridade,
      req.user.id,
    );
  }

  @Put('bulk/prioridade')
  async updateBulkPrioridade(
    @Body() body: { ids: number[]; prioridade: number },
    @Request() req: any,
  ) {
    return this.crawlersService.updateBulkPrioridade(body.ids, body.prioridade, req.user.id);
  }
}
