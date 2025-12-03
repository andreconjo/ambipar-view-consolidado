import { Module } from '@nestjs/common';
import { ManagementSystemsService } from './management-systems.service';
import { ManagementSystemsController } from './management-systems.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ManagementSystemsController],
  providers: [ManagementSystemsService],
  exports: [ManagementSystemsService],
})
export class ManagementSystemsModule {}
