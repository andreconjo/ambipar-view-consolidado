import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateScraperHealthDto, ScraperHealthQueryDto } from './dto/scraper-health.dto';

@Injectable()
export class ScrapersService {
  constructor(private databaseService: DatabaseService) {}

  async createHealthRecord(data: CreateScraperHealthDto) {
    const query = `
      INSERT INTO tb_health_scrappers 
      (service, total_registros, execution_time, state, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.databaseService.executeScrapers(query, [
      data.service,
      data.total_registros || null,
      data.execution_time || null,
      data.state || null,
      data.status,
      data.error_message || null,
    ]);

    return { 
      success: true, 
      message: 'Health record created successfully' 
    };
  }

  async getHealthRecords(filters: ScraperHealthQueryDto) {
    let query = `SELECT * FROM tb_health_scrappers WHERE 1=1`;
    const params: any[] = [];

    if (filters.service) {
      query += ` AND service = ?`;
      params.push(filters.service);
    }

    if (filters.state) {
      query += ` AND state = ?`;
      params.push(filters.state);
    }

    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.startDate) {
      query += ` AND created_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND created_at <= ?`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    } else {
      query += ` LIMIT 100`; // Default limit
    }

    const results = await this.databaseService.queryScrapers(query, params);

    // Converter BigInt para strings
    return results.map((record: any) => ({
      ...record,
      id: record.id?.toString(),
      total_registros: record.total_registros?.toString(),
      execution_time: record.execution_time?.toString(),
      created_at: record.created_at?.toISOString(),
      updated_at: record.updated_at?.toISOString(),
    }));
  }

  async getHealthStats() {
    const query = `
      SELECT 
        service,
        status,
        COUNT(*) as count,
        AVG(execution_time) as avg_execution_time,
        MAX(created_at) as last_execution
      FROM tb_health_scrappers
      GROUP BY service, status
      ORDER BY service, status
    `;

    const results = await this.databaseService.queryScrapers(query);

    return results.map((stat: any) => ({
      ...stat,
      count: stat.count?.toString(),
      avg_execution_time: stat.avg_execution_time?.toString(),
      last_execution: stat.last_execution?.toISOString(),
    }));
  }
}
