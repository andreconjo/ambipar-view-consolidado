import { memo } from 'react';
import { FiEdit2, FiTrash2, FiEye, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import type { Norma } from '../types/norma';
import { getStatusLabel, getStatusBadgeClasses } from '../utils/statusUtils';
import { Loader } from './ui/Loader';

interface NormasTableProps {
  data: Norma[];
  isLoading?: boolean;
  onView: (norma: Norma) => void;
  onEdit: (norma: Norma) => void;
  onDelete: (id: number) => void;
  onAprovar?: (norma: Norma) => void;
  onRecusar?: (norma: Norma) => void;
}

export const NormasTable = memo(({ data, isLoading, onView, onEdit, onDelete, onAprovar, onRecusar }: NormasTableProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative min-h-[400px]">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <Loader />
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ambipar-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Órgão Emissor</th>
              <th className="px-4 py-3 text-left">Data Publicação</th>
              <th className="px-4 py-3 text-left">Origem Publicação</th>
              <th className="px-4 py-3 text-left">Origem Dado</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Aplicável</th>
              <th className="px-4 py-3 text-center">Aprovação</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((norma) => (
              <tr 
                key={norma.id} 
                className={`transition-colors ${
                  norma.status_aprovacao === 'aprovado' 
                    ? 'bg-green-50 hover:bg-green-100' 
                    : norma.status_aprovacao === 'recusado'
                    ? 'bg-red-50 hover:bg-red-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {norma.numero_norma}
                </td>
                <td className="px-4 py-3 text-gray-700">{norma.tipo_norma}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                  {norma.titulo_da_norma}
                </td>
                <td className="px-4 py-3 text-gray-700">{norma.orgao_emissor}</td>
                <td className="px-4 py-3 text-gray-700">
                  {norma.data_publicacao ? format(new Date(norma.data_publicacao), 'dd/MM/yyyy') : '-'}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                    {norma.origem_publicacao || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <span className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded">
                    {norma.origem_dado || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(norma.status_vigencia)}`}
                  >
                    {getStatusLabel(norma.status_vigencia)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {norma.aplicavel ? (
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      Sim
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Não
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center items-center">
                    {norma.status_aprovacao === 'aprovado' ? (
                      <button
                        onClick={() => onRecusar?.(norma)}
                        className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center"
                        title="Recusar"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    ) : norma.status_aprovacao === 'recusado' ? (
                      <button
                        onClick={() => onAprovar?.(norma)}
                        className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center"
                        title="Aprovar"
                      >
                        <FiCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onAprovar?.(norma)}
                          className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center"
                          title="Aprovar"
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRecusar?.(norma)}
                          className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center"
                          title="Recusar"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => onView(norma)}
                      className="p-2 text-ambipar-blue-600 hover:bg-ambipar-blue-50 rounded-lg transition-colors flex items-center justify-center"
                      title="Visualizar"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(norma)}
                      className="p-2 text-ambipar-blue-600 hover:bg-ambipar-blue-50 rounded-lg transition-colors flex items-center justify-center"
                      title="Editar"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(norma.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                      title="Excluir"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
