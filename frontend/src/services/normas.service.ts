import { api } from '../lib/api';
import type { Norma, NormaFormData, NormasResponse, NormasFilters, AprovacaoData } from '../types/norma';

const getNormas = async (params?: NormasFilters & { page?: number; per_page?: number; search?: string }) => {
  const response = await api.get<NormasResponse>('/normas', { params });
  return response.data;
};

const getNormaById = async (id: number) => {
  const response = await api.get<Norma>(`/normas/${id}`);
  return response.data;
};

const createNorma = async (data: NormaFormData) => {
  const response = await api.post('/normas', data);
  return response.data;
};

const updateNorma = async (id: number, data: Partial<NormaFormData>) => {
  const response = await api.put(`/normas/${id}`, data);
  return response.data;
};

const deleteNorma = async (id: number) => {
  const response = await api.delete(`/normas/${id}`);
  return response.data;
};

const getStats = async () => {
  const response = await api.get('/normas/stats');
  return response.data;
};

const getFiltrosValores = async () => {
  const response = await api.get('/normas/filtros/valores');
  return response.data;
};

const syncAplicavel = async () => {
  const response = await api.post('/normas/sync-aplicavel');
  return response.data;
};

const registrarAprovacao = async (normaId: number, data: AprovacaoData) => {
  const response = await api.post(`/normas/${normaId}/aprovacao`, data);
  return response.data;
};

const getHistoricoAprovacao = async (normaId: number) => {
  const response = await api.get(`/normas/${normaId}/aprovacao`);
  return response.data;
};

const getStatusAprovacao = async (normaId: number) => {
  const response = await api.get(`/normas/${normaId}/aprovacao/status`);
  return response.data;
};

export const normasService = {
  getNormas,
  getNormaById,
  create: createNorma,
  update: updateNorma,
  delete: deleteNorma,
  deleteNorma,
  createNorma,
  updateNorma,
  getStats,
  getFiltrosValores,
  syncAplicavel,
  registrarAprovacao,
  getHistoricoAprovacao,
  getStatusAprovacao,
};
