import { api } from '../lib/api';

export interface OrigemData {
  origem: string;
  total: number;
}

export interface MunicipioData {
  municipio: string;
  total: number;
}

export interface SincronizacaoData {
  origem: string;
  ultima_sincronizacao: string;
}

export interface VolumeDiaData {
  dia: string;
  total: number;
}

export const analyticsService = {
  getOrigemDado: async (): Promise<OrigemData[]> => {
    const response = await api.get('/analytics/origem');
    return response.data;
  },

  getOrigemPublicacao: async (): Promise<OrigemData[]> => {
    const response = await api.get('/analytics/origem-publicacao');
    return response.data;
  },

  getMunicipio: async (): Promise<MunicipioData[]> => {
    const response = await api.get('/analytics/municipio');
    return response.data;
  },

  getSincronizacao: async (): Promise<SincronizacaoData[]> => {
    const response = await api.get('/analytics/sincronizacao');
    return response.data;
  },

  getVolumeDia: async (): Promise<VolumeDiaData[]> => {
    const response = await api.get('/analytics/volume-dia');
    return response.data;
  },
};
