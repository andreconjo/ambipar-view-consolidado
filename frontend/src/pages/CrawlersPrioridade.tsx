import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';

interface Crawler {
  id: number;
  fonte: string;
  periodicidade: string;
  pais: string;
  estado: string;
  cidade: string | null;
  prioridade: number;
  ativo: boolean;
}

interface Stats {
  total: number;
  porPrioridade: Array<{ prioridade: number; total: number }>;
  porEstado: Array<{ estado: string; total: number }>;
}

interface Filtros {
  paises: string[];
  estados: string[];
  cidades: string[];
  prioridades: number[];
}

const PRIORIDADE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  5: { label: 'Crítica', color: 'text-red-700', bg: 'bg-red-100' },
  4: { label: 'Alta', color: 'text-orange-700', bg: 'bg-orange-100' },
  3: { label: 'Média', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  2: { label: 'Baixa', color: 'text-blue-700', bg: 'bg-blue-100' },
  1: { label: 'Muito Baixa', color: 'text-gray-700', bg: 'bg-gray-100' },
  0: { label: 'Sem Prioridade', color: 'text-gray-500', bg: 'bg-gray-50' },
};

export default function CrawlersPrioridade() {
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filtros, setFiltros] = useState<Filtros | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros aplicados
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPais, setSelectedPais] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedCidade, setSelectedCidade] = useState('');
  const [selectedPrioridade, setSelectedPrioridade] = useState<number | ''>('');

  // Estados temporários (modificações não salvas)
  const [pendingChanges, setPendingChanges] = useState<Map<number, number>>(new Map());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
    loadStats();
    loadFiltros();
  }, []);

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedPais, selectedEstado, selectedCidade, selectedPrioridade]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedPais) params.append('pais', selectedPais);
      if (selectedEstado) params.append('estado', selectedEstado);
      if (selectedCidade) params.append('cidade', selectedCidade);
      if (selectedPrioridade !== '') params.append('prioridade', selectedPrioridade.toString());

      const response = await api.get(`/crawlers?${params.toString()}`);
      setCrawlers(response.data);
    } catch (error) {
      console.error('Erro ao carregar crawlers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/crawlers/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadFiltros = async () => {
    try {
      const response = await api.get('/crawlers/filtros/valores');
      setFiltros(response.data);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  };

  const handlePrioridadeChange = (id: number, prioridade: number) => {
    setPendingChanges(new Map(pendingChanges.set(id, prioridade)));
  };

  const saveSingleChange = async (id: number) => {
    const prioridade = pendingChanges.get(id);
    if (prioridade === undefined) return;

    try {
      // Adicionar ID aos que estão sendo salvos
      setSavingIds(prev => new Set(prev).add(id));
      
      await api.put(`/crawlers/${id}/prioridade`, { prioridade });
      
      // Atualizar localmente
      setCrawlers(crawlers.map(c => c.id === id ? { ...c, prioridade } : c));
      
      // Remover das mudanças pendentes
      const newChanges = new Map(pendingChanges);
      newChanges.delete(id);
      setPendingChanges(newChanges);
      
      loadStats();
    } catch (error) {
      console.error('Erro ao salvar prioridade:', error);
      alert('Erro ao salvar prioridade');
    } finally {
      // Remover ID dos que estão sendo salvos
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };



  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPais('');
    setSelectedEstado('');
    setSelectedCidade('');
    setSelectedPrioridade('');
  };

  const getCurrentPrioridade = (crawler: Crawler) => {
    return pendingChanges.get(crawler.id) ?? crawler.prioridade;
  };

  const hasPendingChange = (id: number) => {
    return pendingChanges.has(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Prioridades</h1>
          <p className="text-gray-600 mt-2">Defina a prioridade de monitoramento para cada crawler</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-[#005bb3] rounded-xl shadow-lg p-6 text-white">
              <p className="text-white/80 text-sm font-medium">Total de Crawlers</p>
              <p className="text-4xl font-bold mt-2">{stats.total}</p>
            </div>
            {stats.porPrioridade.slice(0, 3).map((item) => {
              const prioridadeInfo = PRIORIDADE_LABELS[item.prioridade];
              return (
                <div key={item.prioridade} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${prioridadeInfo.bg}`}></div>
                    <p className="text-gray-600 text-sm font-medium">{prioridadeInfo.label}</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{item.total}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-6 overflow-hidden">
          <div 
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#005bb3]/10 p-2 rounded-lg">
                <Filter className="w-5 h-5 text-[#005bb3]" />
              </div>
              <span className="font-semibold text-gray-900 text-lg">Filtros de Busca</span>
              {(searchTerm || selectedPais || selectedEstado || selectedCidade || selectedPrioridade !== '') && (
                <span className="bg-[#005bb3] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Filtros ativos
                </span>
              )}
            </div>
            {showFilters ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>

          {showFilters && (
            <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por fonte, cidade ou estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#005bb3] focus:border-[#005bb3] transition-all"
                />
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={selectedPais}
                  onChange={(e) => setSelectedPais(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#005bb3] focus:border-[#005bb3] bg-white"
                >
                  <option value="">Todos os países</option>
                  {filtros?.paises.map((pais) => (
                    <option key={pais} value={pais}>{pais}</option>
                  ))}
                </select>

                <select
                  value={selectedEstado}
                  onChange={(e) => setSelectedEstado(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#005bb3] focus:border-[#005bb3] bg-white"
                >
                  <option value="">Todos os estados</option>
                  {filtros?.estados.map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>

                <select
                  value={selectedCidade}
                  onChange={(e) => setSelectedCidade(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#005bb3] focus:border-[#005bb3] bg-white"
                >
                  <option value="">Todas as cidades</option>
                  {filtros?.cidades.map((cidade) => (
                    <option key={cidade} value={cidade}>{cidade}</option>
                  ))}
                </select>

                <select
                  value={selectedPrioridade}
                  onChange={(e) => setSelectedPrioridade(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#005bb3] focus:border-[#005bb3] bg-white"
                >
                  <option value="">Todas as prioridades</option>
                  {[5, 4, 3, 2, 1, 0].map((p) => (
                    <option key={p} value={p}>{PRIORIDADE_LABELS[p].label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-5 py-2 text-gray-600 hover:text-[#005bb3] font-medium transition-colors"
                >
                  Limpar todos os filtros
                </button>
              </div>
            </div>
          )}
        </div>



        {/* Tabela */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fonte</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">País</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cidade</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Periodicidade</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Prioridade</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : crawlers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Nenhum crawler encontrado
                    </td>
                  </tr>
                ) : (
                  crawlers.map((crawler) => {
                    const currentPrioridade = getCurrentPrioridade(crawler);
                    const isPending = hasPendingChange(crawler.id);
                    const prioridadeInfo = PRIORIDADE_LABELS[currentPrioridade];

                    return (
                      <tr key={crawler.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isPending ? 'bg-yellow-50/50 ring-2 ring-yellow-300' : ''}`}>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{crawler.fonte}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{crawler.pais}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{crawler.estado}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{crawler.cidade || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium">
                            {crawler.periodicidade} dias
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={currentPrioridade}
                            onChange={(e) => handlePrioridadeChange(crawler.id, parseInt(e.target.value))}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 cursor-pointer transition-all ${prioridadeInfo.bg} ${prioridadeInfo.color} ${isPending ? 'ring-2 ring-yellow-400 shadow-md' : 'hover:shadow-sm'}`}
                          >
                            {[5, 4, 3, 2, 1, 0].map((p) => (
                              <option key={p} value={p}>
                                {PRIORIDADE_LABELS[p].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          {isPending && (
                            <button
                              onClick={() => saveSingleChange(crawler.id)}
                              disabled={savingIds.has(crawler.id)}
                              className="bg-[#005bb3] text-white px-4 py-2 rounded-lg hover:bg-[#004a94] text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {savingIds.has(crawler.id) ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Salvando...
                                </>
                              ) : (
                                'Salvar'
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
