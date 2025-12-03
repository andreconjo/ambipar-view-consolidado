import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller()
export class HealthController {
  constructor(private databaseService: DatabaseService) {}

  @Get('health')
  async check() {
    try {
      // Check database connection
      await this.databaseService.query('SELECT 1');

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
        },
        error: error.message,
      };
    }
  }
}
