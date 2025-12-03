import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ScrapersService } from './scrapers.service';
import { CreateScraperHealthDto, ScraperHealthQueryDto } from './dto/scraper-health.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('scrapers')
@UseGuards(JwtAuthGuard)
export class ScrapersController {
  constructor(private readonly scrapersService: ScrapersService) {}

  @Post('health')
  async createHealthRecord(@Body() data: CreateScraperHealthDto) {
    return this.scrapersService.createHealthRecord(data);
  }

  @Get('health')
  async getHealthRecords(@Query() filters: ScraperHealthQueryDto) {
    return this.scrapersService.getHealthRecords(filters);
  }

  @Get('health/stats')
  async getHealthStats() {
    return this.scrapersService.getHealthStats();
  }
}
