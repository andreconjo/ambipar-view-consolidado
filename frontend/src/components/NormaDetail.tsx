import type { Norma } from '../types/norma';
import { Modal } from './ui/Modal';
import { format } from 'date-fns';
import { getStatusLabel, getStatusBadgeClasses } from '../utils/statusUtils';

interface NormaDetailProps {
  norma: Norma;
  onClose: () => void;
}

export const NormaDetail = ({ norma, onClose }: NormaDetailProps) => {
  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch {
      return date;
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="py-3 border-b border-gray-200 last:border-0">
      <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-base text-gray-900">{value || '-'}</dd>
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title="Detalhes da Norma" size="xl">
      <div className="space-y-6">
        <div className="bg-ambipar-blue-50 p-6 rounded-lg">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {norma.titulo_da_norma}
          </h3>
          <p className="text-gray-700">
            {norma.tipo_norma} nº {norma.numero_norma}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h4>
            <dl className="space-y-1">
              <DetailRow label="Divisão Política" value={norma.divisao_politica} />
              <DetailRow label="Órgão Emissor" value={norma.orgao_emissor} />
              <DetailRow label="Data de Publicação" value={formatDate(norma.data_publicacao)} />
              <DetailRow label="Data de Início de Vigência" value={formatDate(norma.data_inicio_vigencia)} />
              <div className="py-3 border-b border-gray-200">
                <dt className="text-sm font-medium text-gray-500 mb-1">Status de Vigência</dt>
                <dd className="text-base">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(norma.status_vigencia)}`}>
                    {getStatusLabel(norma.status_vigencia)}
                  </span>
                </dd>
              </div>
              <DetailRow label="Idioma Original" value={norma.idioma_original} />
            </dl>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Classificação</h4>
            <dl className="space-y-1">
              <div className="py-3 border-b border-gray-200">
                <dt className="text-sm font-medium text-gray-500 mb-1">Aplicável</dt>
                <dd className="text-base">
                  {norma.aplicavel ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      Sim
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Não
                    </span>
                  )}
                </dd>
              </div>
              {norma.sistema_gestao && (
                <div className="py-3 border-b border-gray-200">
                  <dt className="text-sm font-medium text-gray-500 mb-1">Sistema de Gestão (Classificado)</dt>
                  <dd className="text-base">
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                      {norma.sistema_gestao}
                    </span>
                  </dd>
                </div>
              )}
              <DetailRow label="Temas" value={norma.temas} />
              <DetailRow label="Sistema de Gestão" value={norma.sistema_de_gestao} />
              <DetailRow label="Ramo de Atividade" value={norma.ramo_de_atividade} />
              <DetailRow label="Origem da Publicação" value={norma.origem_publicacao} />
              <DetailRow label="Documento de Referência" value={norma.documento_referencia} />
            </dl>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Ementa</h4>
          <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
            {norma.ementa || 'Não informado'}
          </p>
        </div>

        {norma.texto_integral && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Texto Integral</h4>
            <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {norma.texto_integral}
            </div>
          </div>
        )}

        {norma.artigos_no_texto && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Artigos no Texto</h4>
            <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
              {norma.artigos_no_texto}
            </p>
          </div>
        )}

        {norma.normas_citadas && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Normas Citadas</h4>
            <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
              {norma.normas_citadas}
            </p>
          </div>
        )}

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Referências</h4>
          <dl className="space-y-1">
            <DetailRow label="Referência Norma Anterior" value={norma.referencia_norma_anterior} />
            {norma.link_documento && (
              <div className="py-3">
                <dt className="text-sm font-medium text-gray-500 mb-1">Link do Documento</dt>
                <dd>
                  <a
                    href={norma.link_documento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ambipar-blue-600 hover:text-ambipar-blue-700 underline"
                  >
                    Acessar documento
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="text-sm text-gray-500 pt-4 border-t">
          <p>Criado em: {formatDate(norma.criado_em)}</p>
          <p>Atualizado em: {formatDate(norma.atualizado_em)}</p>
        </div>
      </div>
    </Modal>
  );
};
