import { api } from '../lib/api';

export interface ScraperHealthRecord {
  id: string;
  service: string;
  total_registros: string;
  execution_time: string;
  state: string;
  status: 'success' | 'error' | 'running';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ScraperHealthStats {
  service: string;
  status: string;
  count: string;
  avg_execution_time: string;
  last_execution: string;
}

export interface ScraperHealthQuery {
  service?: string;
  state?: string;
  status?: 'success' | 'error' | 'running';
  startDate?: string;
  endDate?: string;
  limit?: number;
}



export const scrapersService = {
  async getHealthRecords(filters?: ScraperHealthQuery): Promise<ScraperHealthRecord[]> {
    const params = new URLSearchParams();
    
    if (filters?.service) params.append('service', filters.service);
    if (filters?.state) params.append('state', filters.state);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/scrapers/health?${params.toString()}`);
    return response.data;
  },

  async getHealthStats(): Promise<ScraperHealthStats[]> {
    const response = await api.get('/scrapers/health/stats');
    return response.data;
  },
};
