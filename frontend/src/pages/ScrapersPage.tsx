import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { scrapersService } from '../services/scrapers.service';
import type { ScraperHealthRecord } from '../services/scrapers.service';
import { Loader } from '../components/ui/Loader';
import { Card } from '../components/ui/Card';

export default function ScrapersPage() {
  const [daysRange, setDaysRange] = useState(7);

  const startDate = format(subDays(new Date(), daysRange), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: healthRecords, isLoading } = useQuery({
    queryKey: ['scrapers-health', startDate, endDate],
    queryFn: () => scrapersService.getHealthRecords({
      startDate: startDate + 'T00:00:00',
      endDate: endDate + 'T23:59:59',
      limit: 1000,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['scrapers-stats'],
    queryFn: () => scrapersService.getHealthStats(),
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // Processar dados para os gráficos
  const processDataForCharts = () => {
    if (!healthRecords || healthRecords.length === 0) {
      return {
        dailyExecutions: { dates: [], counts: [] },
        serviceBreakdown: { services: [], counts: [] },
        statusDistribution: { labels: [], series: [] },
        executionsByDay: {},
      };
    }

    // Agrupar por dia
    const executionsByDay: Record<string, { total: number; success: number; error: number; services: Set<string> }> = {};
    
    healthRecords.forEach((record: ScraperHealthRecord) => {
      const date = format(parseISO(record.created_at), 'yyyy-MM-dd');
      
      if (!executionsByDay[date]) {
        executionsByDay[date] = { total: 0, success: 0, error: 0, services: new Set() };
      }
      
      executionsByDay[date].total++;
      executionsByDay[date].services.add(record.service);
      
      if (record.status === 'success') {
        executionsByDay[date].success++;
      } else if (record.status === 'error') {
        executionsByDay[date].error++;
      }
    });

    // Ordenar datas
    const sortedDates = Object.keys(executionsByDay).sort();
    
    // Dados para gráfico de execuções diárias
    const dailyExecutions = {
      dates: sortedDates.map(date => format(parseISO(date), 'dd/MM', { locale: ptBR })),
      counts: sortedDates.map(date => executionsByDay[date].total),
      success: sortedDates.map(date => executionsByDay[date].success),
      error: sortedDates.map(date => executionsByDay[date].error),
    };

    // Dados para gráfico de serviços
    const serviceCount: Record<string, number> = {};
    healthRecords.forEach((record: ScraperHealthRecord) => {
      serviceCount[record.service] = (serviceCount[record.service] || 0) + 1;
    });

    const serviceBreakdown = {
      services: Object.keys(serviceCount),
      counts: Object.values(serviceCount),
    };

    // Dados para gráfico de status
    const statusCount = { success: 0, error: 0, running: 0 };
    healthRecords.forEach((record: ScraperHealthRecord) => {
      statusCount[record.status]++;
    });

    const statusDistribution = {
      labels: ['Sucesso', 'Erro', 'Executando'],
      series: [statusCount.success, statusCount.error, statusCount.running],
    };

    return { dailyExecutions, serviceBreakdown, statusDistribution, executionsByDay };
  };

  const chartData = processDataForCharts();

  // Configuração do gráfico de execuções diárias (linha)
  const dailyExecutionsOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    colors: ['#10b981', '#ef4444'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      categories: chartData.dailyExecutions.dates,
      title: { text: 'Data' },
    },
    yaxis: {
      title: { text: 'Execuções' },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
  };

  const dailyExecutionsSeries = [
    {
      name: 'Sucesso',
      data: 'success' in chartData.dailyExecutions ? chartData.dailyExecutions.success : [],
    },
    {
      name: 'Erro',
      data: 'error' in chartData.dailyExecutions ? chartData.dailyExecutions.error : [],
    },
  ];

  // Configuração do gráfico de serviços (barra)
  const serviceBreakdownOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: { position: 'top' },
      },
    },
    colors: ['#3b82f6'],
    dataLabels: {
      enabled: true,
      offsetX: 30,
      style: { fontSize: '12px', colors: ['#fff'] },
    },
    xaxis: {
      categories: chartData.serviceBreakdown.services,
      title: { text: 'Execuções' },
    },
    yaxis: {
      title: { text: 'Serviço' },
    },
  };

  const serviceBreakdownSeries = [
    {
      name: 'Execuções',
      data: chartData.serviceBreakdown.counts,
    },
  ];

  // Configuração do gráfico de status (pizza)
  const statusDistributionOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 350,
    },
    labels: chartData.statusDistribution.labels,
    colors: ['#10b981', '#ef4444', '#f59e0b'],
    legend: {
      position: 'bottom',
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => {
                const total = chartData.statusDistribution.series.reduce((a, b) => a + b, 0);
                return total.toString();
              },
            },
          },
        },
      },
    },
  };

  // Scrapers ativos (que executaram no período)
  const activeScrapers = new Set(healthRecords?.map((r: ScraperHealthRecord) => r.service) || []);
  const workingScrapers = stats?.filter(s => 
    s.status === 'success' && activeScrapers.has(s.service)
  ) || [];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Monitoramento de Scrapers
        </h1>
        <p className="text-gray-600">
          Acompanhe a execução e desempenho dos scrapers de dados
        </p>
      </div>

      {/* Filtro de período */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setDaysRange(7)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            daysRange === 7
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Últimos 7 dias
        </button>
        <button
          onClick={() => setDaysRange(15)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            daysRange === 15
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Últimos 15 dias
        </button>
        <button
          onClick={() => setDaysRange(30)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            daysRange === 30
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Últimos 30 dias
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Total de Execuções</p>
            <p className="text-3xl font-bold text-gray-900">
              {healthRecords?.length || 0}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Scrapers Ativos</p>
            <p className="text-3xl font-bold text-blue-600">
              {activeScrapers.size}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Funcionando</p>
            <p className="text-3xl font-bold text-green-600">
              {workingScrapers.length}
            </p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Taxa de Sucesso</p>
            <p className="text-3xl font-bold text-gray-900">
              {healthRecords && healthRecords.length > 0
                ? (
                    (healthRecords.filter((r: ScraperHealthRecord) => r.status === 'success').length /
                      healthRecords.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="Execuções por Dia">
          <ReactApexChart
            options={dailyExecutionsOptions}
            series={dailyExecutionsSeries}
            type="line"
            height={350}
          />
        </Card>

        <Card title="Distribuição por Status">
          <ReactApexChart
            options={statusDistributionOptions}
            series={chartData.statusDistribution.series}
            type="donut"
            height={350}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card title="Execuções por Serviço">
          <ReactApexChart
            options={serviceBreakdownOptions}
            series={serviceBreakdownSeries}
            type="bar"
            height={350}
          />
        </Card>
      </div>

      {/* Lista de scrapers funcionando */}
      <Card title="Scrapers Funcionando (com dados recentes)">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Execuções
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tempo Médio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Execução
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workingScrapers.length > 0 ? (
                workingScrapers.map((scraper, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {scraper.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {scraper.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {parseFloat(scraper.avg_execution_time).toFixed(1)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(scraper.last_execution), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Funcionando
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum scraper funcionando encontrado no período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
