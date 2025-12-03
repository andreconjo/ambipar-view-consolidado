import { Module } from '@nestjs/common';
import { ScrapersController } from './scrapers.controller';
import { ScrapersService } from './scrapers.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ScrapersController],
  providers: [ScrapersService],
})
export class ScrapersModule {}
