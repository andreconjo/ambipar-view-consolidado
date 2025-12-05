import { useState, memo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSearch, FiPlus, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { normasService } from '../services/normas.service';
import type { Norma, NormasFilters } from '../types/norma';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { NormaForm } from '../components/NormaForm';
import { NormaDetail } from '../components/NormaDetail';
import { NormasTable } from '../components/NormasTable';
import { Footer } from '../components/Footer';
import { mockNormas } from '../data/mockNormas';

const USE_MOCK_DATA = false;

// Componente de filtros memoizado
interface FiltersProps {
  searchInput: string;
  filters: NormasFilters;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onFilterChange: (key: keyof NormasFilters, value: string) => void;
  onNewNorma: () => void;
  onSyncAplicavel: () => void;
  isSyncing: boolean;
  filtrosValores?: {
    tipo_norma: string[];
    divisao_politica: string[];
    status_vigencia: string[];
    origem_publicacao: string[];
    origem_dado: string[];
  };
}

const Filters = memo(({ searchInput, filters, onSearchInputChange, onSearch, onFilterChange, onNewNorma, onSyncAplicavel, isSyncing, filtrosValores }: FiltersProps) => (
  <Card className="mb-6">
    <div className="space-y-6">
      {/* Seção de Busca e Ações */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por número, título, ementa..."
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={onSearch} className="whitespace-nowrap">
            <FiSearch />
            Buscar
          </Button>
          <Button onClick={onNewNorma} variant="secondary" className="whitespace-nowrap">
            <FiPlus />
            Nova Norma
          </Button>
          <Button 
            onClick={onSyncAplicavel} 
            variant="secondary"
            disabled={isSyncing}
            className="whitespace-nowrap"
          >
            <FiRefreshCw className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Divisor */}
      <div className="border-t border-gray-200"></div>

      {/* Título dos Filtros */}
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-gray-700">Filtros Avançados</div>
        <div className="h-px flex-1 bg-gray-200"></div>
        {(filters.tipo_norma || filters.status_vigencia || filters.divisao_politica || 
          filters.origem_publicacao || filters.origem_dado || filters.orgao_emissor || filters.aplicavel || filters.status_aprovacao) && (
          <button
            onClick={() => {
              onFilterChange('tipo_norma', '');
              onFilterChange('status_vigencia', '');
              onFilterChange('divisao_politica', '');
              onFilterChange('origem_publicacao', '');
              onFilterChange('origem_dado', '');
              onFilterChange('orgao_emissor', '');
              onFilterChange('aplicavel', '');
              onFilterChange('status_aprovacao', '');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Grid de Filtros Organizado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro Tipo de Norma */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Tipo de Norma</label>
          <Select
            value={filters.tipo_norma}
            onChange={(e) => onFilterChange('tipo_norma', e.target.value)}
            className="w-full"
          >
            <option value="">Todos os tipos</option>
            {filtrosValores?.tipo_norma?.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </Select>
        </div>

        {/* Filtro Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Status de Vigência</label>
          <Select
            value={filters.status_vigencia}
            onChange={(e) => onFilterChange('status_vigencia', e.target.value)}
            className="w-full"
          >
            <option value="">Todos os status</option>
            {filtrosValores?.status_vigencia?.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </div>

        {/* Filtro Divisão Política */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Divisão Política</label>
          <Select
            value={filters.divisao_politica}
            onChange={(e) => onFilterChange('divisao_politica', e.target.value)}
            className="w-full"
          >
            <option value="">Todas as divisões</option>
            {filtrosValores?.divisao_politica?.map((divisao) => (
              <option key={divisao} value={divisao}>{divisao}</option>
            ))}
          </Select>
        </div>

        {/* Filtro Aplicável */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">
            Aplicabilidade
          </label>
          <Select
            value={filters.aplicavel || ''}
            onChange={(e) => onFilterChange('aplicavel', e.target.value)}
            className="w-full"
          >
            <option value="">Todas as normas</option>
            <option value="true">Apenas Aplicáveis</option>
            <option value="false">Não Aplicáveis</option>
          </Select>
        </div>

        {/* Filtro Origem Publicação */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Origem da Publicação</label>
          <Select
            value={filters.origem_publicacao}
            onChange={(e) => onFilterChange('origem_publicacao', e.target.value)}
            className="w-full"
          >
            <option value="">Todas as origens</option>
            {filtrosValores?.origem_publicacao?.map((origem) => (
              <option key={origem} value={origem}>{origem}</option>
            ))}
          </Select>
        </div>

        {/* Filtro Origem Dado */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Origem do Dado</label>
          <Select
            value={filters.origem_dado}
            onChange={(e) => onFilterChange('origem_dado', e.target.value)}
            className="w-full"
          >
            <option value="">Todas as origens</option>
            {filtrosValores?.origem_dado?.map((origem) => (
              <option key={origem} value={origem}>{origem}</option>
            ))}
          </Select>
        </div>

        {/* Filtro Órgão Emissor */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Órgão Emissor</label>
          <Select
            value={filters.orgao_emissor}
            onChange={(e) => onFilterChange('orgao_emissor', e.target.value)}
            className="w-full"
          >
            <option value="">Todos os órgãos</option>
          </Select>
        </div>

        {/* Filtro Status de Aprovação */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 px-1">Status de Aprovação</label>
          <Select
            value={filters.status_aprovacao || ''}
            onChange={(e) => onFilterChange('status_aprovacao', e.target.value)}
            className="w-full"
          >
            <option value="">Todas</option>
            <option value="aprovado">Aprovadas</option>
            <option value="recusado">Recusadas</option>
          </Select>
        </div>
      </div>
    </div>
  </Card>
));

Filters.displayName = 'Filters';

// Componente de paginação memoizado
interface PaginationProps {
  page: number;
  pageSize: number;
  pageInput: string;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onPageInputChange: (input: string) => void;
}

const Pagination = memo(({ page, pageSize, pageInput, total, totalPages, onPageChange, onPageSizeChange, onPageInputChange }: PaginationProps) => (
  <div className="bg-white rounded-lg shadow-md p-4 mt-6">
    <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Exibir
          </label>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ambipar-blue-500 focus:border-transparent bg-white cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span className="text-sm text-gray-700">registros</span>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {((page - 1) * pageSize + 1).toLocaleString('pt-BR')}
          </span>
          {' - '}
          <span className="font-medium text-gray-900">
            {Math.min(page * pageSize, total).toLocaleString('pt-BR')}
          </span>
          {' de '}
          <span className="font-semibold text-ambipar-blue-600">
            {total.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto justify-center">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Primeira página"
        >
          ««
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Página anterior"
        >
          «
        </button>
        
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm text-gray-600">Página</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={(e) => onPageInputChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const newPage = parseInt(pageInput);
                if (newPage >= 1 && newPage <= totalPages) {
                  onPageChange(newPage);
                } else {
                  onPageInputChange(page.toString());
                }
              }
            }}
            onBlur={() => {
              const newPage = parseInt(pageInput);
              if (newPage >= 1 && newPage <= totalPages) {
                onPageChange(newPage);
              } else {
                onPageInputChange(page.toString());
              }
            }}
            className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ambipar-blue-500 focus:border-transparent cursor-text"
          />
          <span className="text-sm text-gray-600">
            de <span className="font-medium text-gray-900">{totalPages.toLocaleString('pt-BR')}</span>
          </span>
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Próxima página"
        >
          »
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          title="Última página"
        >
          »»
        </button>
      </div>
    </div>
  </div>
));

Pagination.displayName = 'Pagination';

export default function NormasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NormasFilters>({});
  const [selectedNorma, setSelectedNorma] = useState<Norma | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAprovacaoModalOpen, setIsAprovacaoModalOpen] = useState(false);
  const [aprovacaoStatus, setAprovacaoStatus] = useState<'aprovado' | 'recusado' | null>(null);
  const [isSubmittingAprovacao, setIsSubmittingAprovacao] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [pageInput, setPageInput] = useState('1');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['normas', page, pageSize, searchQuery, filters],
    queryFn: () => normasService.getNormas({ page, per_page: pageSize, search: searchQuery, ...filters }),
    enabled: !USE_MOCK_DATA,
  });

  const { data: filtrosValores } = useQuery({
    queryKey: ['filtros-valores'],
    queryFn: () => normasService.getFiltrosValores(),
    enabled: !USE_MOCK_DATA,
  });

  const normas = USE_MOCK_DATA ? mockNormas : (data?.data || []);
  const pagination = USE_MOCK_DATA ? { page: 1, per_page: 20, total: mockNormas.length, pages: 1 } : data?.pagination;

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput);
    setPage(1);
    setPageInput('1');
  }, [searchInput]);

  const handleFilterChange = useCallback((key: keyof NormasFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setPageInput('1');
  }, []);

  const handleSyncAplicavel = useCallback(async () => {
    setIsSyncing(true);
    try {
      await normasService.syncAplicavel();
      await refetch();
      toast.success('Sincronização concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar normas aplicáveis');
    } finally {
      setIsSyncing(false);
    }
  }, [refetch]);

  const handleAprovar = useCallback((norma: Norma) => {
    setSelectedNorma(norma);
    setAprovacaoStatus('aprovado');
    setIsAprovacaoModalOpen(true);
  }, []);

  const handleRecusar = useCallback((norma: Norma) => {
    setSelectedNorma(norma);
    setAprovacaoStatus('recusado');
    setIsAprovacaoModalOpen(true);
  }, []);

  const handleConfirmarAprovacao = useCallback(async () => {
    if (!selectedNorma || !aprovacaoStatus) {
      return;
    }

    setIsSubmittingAprovacao(true);
    try {
      await normasService.registrarAprovacao(selectedNorma.id, {
        status: aprovacaoStatus,
      });
      
      toast.success(`Norma ${aprovacaoStatus === 'aprovado' ? 'aprovada' : 'recusada'} com sucesso!`);
      setIsAprovacaoModalOpen(false);
      setSelectedNorma(null);
      setAprovacaoStatus(null);
      await refetch();
    } catch (error) {
      console.error('Erro ao registrar aprovação:', error);
      toast.error('Erro ao registrar aprovação');
    } finally {
      setIsSubmittingAprovacao(false);
    }
  }, [selectedNorma, aprovacaoStatus, refetch]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => normasService.deleteNorma(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normas'] });
      toast.success('Norma excluída com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir norma');
    },
  });

  const handleDelete = useCallback((id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta norma?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Normas</h1>
          <p className="mt-2 text-gray-600">
            Visualize, crie e gerencie normas jurídicas de forma centralizada
          </p>
        </div>

        <Filters
          searchInput={searchInput}
          filters={filters}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onNewNorma={() => {
            setSelectedNorma(null);
            setIsFormOpen(true);
          }}
          onSyncAplicavel={handleSyncAplicavel}
          isSyncing={isSyncing}
          filtrosValores={filtrosValores}
        />

        {isLoading && !USE_MOCK_DATA ? (
          <div className="flex justify-center items-center py-12">
            <Loader />
          </div>
        ) : (
          <>
            <NormasTable
              data={normas}
              isLoading={isLoading}
              onView={(norma) => {
                setSelectedNorma(norma);
                setIsDetailOpen(true);
              }}
              onEdit={(norma) => {
                setSelectedNorma(norma);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
              onAprovar={handleAprovar}
              onRecusar={handleRecusar}
            />

            {pagination && (
              <Pagination
                page={page}
                pageSize={pageSize}
                pageInput={pageInput}
                total={pagination.total}
                totalPages={pagination.pages}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  setPageInput(newPage.toString());
                }}
                onPageSizeChange={setPageSize}
                onPageInputChange={setPageInput}
              />
            )}
          </>
        )}

        {/* Modal de Formulário */}
        {isFormOpen && (
          <NormaForm
            norma={selectedNorma}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedNorma(null);
            }}
            onSuccess={() => {
              refetch();
              setIsFormOpen(false);
              setSelectedNorma(null);
            }}
          />
        )}

        {/* Modal de Detalhes */}
        {isDetailOpen && selectedNorma && (
          <NormaDetail
            norma={selectedNorma}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedNorma(null);
            }}
          />
        )}

        {/* Modal de Aprovação */}
        {isAprovacaoModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      aprovacaoStatus === 'aprovado' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}
                  >
                    <span className={`text-2xl ${
                      aprovacaoStatus === 'aprovado' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {aprovacaoStatus === 'aprovado' ? '✓' : '✗'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {aprovacaoStatus === 'aprovado' ? 'Aprovar Norma' : 'Recusar Norma'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedNorma?.numero_norma}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-semibold">Título:</span>
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {selectedNorma?.titulo_da_norma}
                  </p>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  Você tem certeza que deseja{' '}
                  <strong className={aprovacaoStatus === 'aprovado' ? 'text-green-600' : 'text-red-600'}>
                    {aprovacaoStatus === 'aprovado' ? 'aprovar' : 'recusar'}
                  </strong>
                  {' '}esta norma? Esta ação ficará registrada em seu nome no histórico.
                </p>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsAprovacaoModalOpen(false);
                      setSelectedNorma(null);
                      setAprovacaoStatus(null);
                    }}
                    disabled={isSubmittingAprovacao}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmarAprovacao}
                    variant={aprovacaoStatus === 'aprovado' ? 'secondary' : 'danger'}
                    disabled={isSubmittingAprovacao}
                  >
                    {isSubmittingAprovacao ? (
                      <>
                        <span className="animate-spin inline-block mr-2">⏳</span>
                        Processando...
                      </>
                    ) : (
                      aprovacaoStatus === 'aprovado' ? '✓ Confirmar Aprovação' : '✗ Confirmar Recusa'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
