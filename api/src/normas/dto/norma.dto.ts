export interface Norma {
  id: number;
  tipo_norma: string;
  numero_norma: string;
  ano_publicacao: number;
  ementa: string;
  situacao: string;
  status_vigencia: string;
  divisao_politica: string;
  origem_publicacao: string;
  origem_dado: string;
  link_norma: string;
  data_publicacao: string;
  aplicavel: boolean;
  sistema_gestao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NormasFilterParams {
  tipo_norma?: string;
  status_vigencia?: string;
  divisao_politica?: string;
  origem_publicacao?: string;
  origem_dado?: string;
  aplicavel?: string;
  search?: string;
  page?: number;
  per_page?: number;
}
