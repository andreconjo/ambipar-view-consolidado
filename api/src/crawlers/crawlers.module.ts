import { Module } from '@nestjs/common';
import { CrawlersController } from './crawlers.controller';
import { CrawlersService } from './crawlers.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CrawlersController],
  providers: [CrawlersService],
})
export class CrawlersModule {}
