export interface Norma {
  id: number;
  divisao_politica: string;
  numero_norma: string;
  tipo_norma: string;
  orgao_emissor: string;
  data_publicacao: string;
  data_inicio_vigencia: string;
  status_vigencia: string;
  ementa: string;
  titulo_da_norma: string;
  texto_integral: string;
  artigos_no_texto: string;
  idioma_original: string;
  link_documento: string;
  origem_publicacao: string;
  origem_dado: string;
  referencia_norma_anterior: string;
  hash_versao: string;
  normas_citadas: string;
  temas: string;
  sistema_de_gestao: string;
  ramo_de_atividade: string;
  documento_referencia: string;
  criado_em: string;
  atualizado_em: string;
  aplicavel?: boolean;
  status_aprovacao?: 'aprovado' | 'recusado' | null;
}

export interface AprovacaoData {
  status: 'aprovado' | 'recusado';
  solicitante: string;
  observacao?: string;
}

export interface AprovacaoHistorico {
  id: number;
  norma_id: number;
  status: 'aprovado' | 'recusado';
  solicitante: string;
  data_registro: string;
  observacao?: string;
}

export interface NormaFormData {
  divisao_politica: string;
  numero_norma: string;
  tipo_norma: string;
  orgao_emissor: string;
  data_publicacao: string;
  data_inicio_vigencia: string;
  status_vigencia: string;
  ementa: string;
  titulo_da_norma: string;
  texto_integral: string;
  artigos_no_texto: string;
  idioma_original: string;
  link_documento: string;
  origem_publicacao: string;
  origem_dado: string;
  referencia_norma_anterior: string;
  normas_citadas: string;
  temas: string;
  sistema_de_gestao: string;
  ramo_de_atividade: string;
  documento_referencia: string;
}

export interface NormasResponse {
  data: Norma[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface NormasFilters {
  search?: string;
  tipo_norma?: string;
  orgao_emissor?: string;
  status_vigencia?: string;
  divisao_politica?: string;
  origem_publicacao?: string;
  origem_dado?: string;
  aplicavel?: string;
  status_aprovacao?: string;
}
