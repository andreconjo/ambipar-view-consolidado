import { Module } from '@nestjs/common';
import { AzureSyncService } from './azure-sync.service';
import { AzureSyncController } from './azure-sync.controller';
import { TestSyncController } from './test-sync.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AzureSyncController, TestSyncController],
  providers: [AzureSyncService],
  exports: [AzureSyncService],
})
export class AzureSyncModule {}
