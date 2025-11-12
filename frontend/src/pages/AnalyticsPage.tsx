import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { analyticsService } from '../services/analytics.service';
import { Loader } from '../components/ui/Loader';
import { Card } from '../components/ui/Card';

interface ChartData {
  origemDado: { labels: string[]; series: number[] };
  origemPublicacao: { labels: string[]; series: number[] };
  municipio: { labels: string[]; series: number[] };
  sincronizacao: { labels: string[]; dates: string[] };
  volumeDia: { categories: string[]; series: number[] };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [origemDado, origemPublicacao, municipio, sincronizacao, volumeDia] =
        await Promise.all([
          analyticsService.getOrigemDado(),
          analyticsService.getOrigemPublicacao(),
          analyticsService.getMunicipio(),
          analyticsService.getSincronizacao(),
          analyticsService.getVolumeDia(),
        ]);

      setChartData({
        origemDado: {
          labels: origemDado.map((d) => d.origem),
          series: origemDado.map((d) => d.total),
        },
        origemPublicacao: {
          labels: origemPublicacao.map((d) => d.origem),
          series: origemPublicacao.map((d) => d.total),
        },
        municipio: {
          labels: municipio.map((d) => d.municipio),
          series: municipio.map((d) => d.total),
        },
        sincronizacao: {
          labels: sincronizacao.map((d) => d.origem),
          dates: sincronizacao.map((d) => d.ultima_sincronizacao),
        },
        volumeDia: {
          categories: volumeDia.map((d) => d.dia),
          series: volumeDia.map((d) => d.total),
        },
      });
    } catch (err) {
      setError('Erro ao carregar dados de análise');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Erro ao carregar dados'}
        </div>
      </div>
    );
  }

  // Configurações dos gráficos
  const pieOptions: ApexOptions = {
    chart: { type: 'pie', fontFamily: 'Inter, system-ui, sans-serif' },
    legend: { position: 'bottom' },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { width: 300 },
          legend: { position: 'bottom' },
        },
      },
    ],
  };

  const barOptions: ApexOptions = {
    chart: { type: 'bar', fontFamily: 'Inter, system-ui, sans-serif', toolbar: { show: true } },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData.municipio.labels,
    },
  };

  const lineOptions: ApexOptions = {
    chart: {
      type: 'line',
      fontFamily: 'Inter, system-ui, sans-serif',
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      categories: chartData.volumeDia.categories,
      type: 'datetime',
    },
    yaxis: {
      title: { text: 'Quantidade' },
    },
    markers: { size: 4 },
    colors: ['#3b82f6'],
  };

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter, system-ui, sans-serif' },
    legend: { position: 'bottom' },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { width: 300 },
          legend: { position: 'bottom' },
        },
      },
    ],
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Análise de Dados</h1>
        <p className="text-gray-600 mt-2">Visualização e análise das normas consolidadas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quantidade por Origem de Dado */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quantidade de Leis por Origem de Dado
          </h2>
          <Chart
            options={{ ...pieOptions, labels: chartData.origemDado.labels }}
            series={chartData.origemDado.series}
            type="pie"
            height={350}
          />
        </Card>

        {/* Quantidade por Origem de Publicação */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quantidade por Origem de Publicação
          </h2>
          <Chart
            options={{ ...donutOptions, labels: chartData.origemPublicacao.labels }}
            series={chartData.origemPublicacao.series}
            type="donut"
            height={350}
          />
        </Card>

        {/* Top 20 Municípios */}
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Top 20 Municípios com Mais Normas
          </h2>
          <Chart
            options={barOptions}
            series={[{ name: 'Quantidade', data: chartData.municipio.series }]}
            type="bar"
            height={500}
          />
        </Card>

        {/* Última Sincronização */}
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Última Sincronização por Origem
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Sincronização
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.sincronizacao.labels.map((origem, index) => (
                  <tr key={origem}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {origem}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(chartData.sincronizacao.dates[index]).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Volume por Dia */}
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Volume de Publicações por Dia (Últimos 90 dias)
          </h2>
          <Chart
            options={lineOptions}
            series={[{ name: 'Publicações', data: chartData.volumeDia.series }]}
            type="line"
            height={400}
          />
        </Card>
      </div>
    </div>
  );
}
