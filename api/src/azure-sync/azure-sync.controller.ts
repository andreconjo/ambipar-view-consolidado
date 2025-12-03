import { Controller, Post, UseGuards } from '@nestjs/common';
import { AzureSyncService } from './azure-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('azure-sync')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AzureSyncController {
  constructor(private azureSyncService: AzureSyncService) {}

  @Post('normas')
  syncNormas() {
    return this.azureSyncService.syncNormas();
  }

  @Post('classifications')
  syncClassifications() {
    return this.azureSyncService.syncManagementClassifications();
  }

  @Post('all')
  syncAll() {
    return this.azureSyncService.manualSyncAll();
  }
}
