'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Info } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Projection {
  period: string;
  actual?: number;
  projected: number;
  lower_bound: number;
  upper_bound: number;
}

interface DataPoint {
  period: string;
  value: number;
}

interface ProjectionResult {
  historical: DataPoint[];
  projections: Projection[];
  metrics: {
    trend: 'up' | 'down' | 'stable';
    growth_rate: number;
    confidence: number;
    r_squared?: number;
  };
}

interface Pharmacy {
  id: number;
  name: string;
}

export default function ProjectionsPage() {
  const [data, setData] = useState<ProjectionResult | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [periods, setPeriods] = useState(6);
  const [pharmacyId, setPharmacyId] = useState<string>('');

  const fetchProjections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        periods: periods.toString(),
      });
      if (pharmacyId) params.append('pharmacy_id', pharmacyId);

      const response = await fetch(`/api/projections?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching projections:', error);
    } finally {
      setLoading(false);
    }
  }, [period, periods, pharmacyId]);

  const fetchPharmacies = useCallback(async () => {
    try {
      const response = await fetch('/api/pharmacies');
      if (response.ok) {
        const result = await response.json();
        setPharmacies(result);
      }
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  useEffect(() => {
    fetchProjections();
  }, [fetchProjections]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'down': return <TrendingDown className="w-5 h-5 text-red-400" />;
      default: return <Minus className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-emerald-400';
      case 'down': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const chartData = data ? {
    labels: [
      ...data.historical.map(d => d.period),
      ...data.projections.map(p => p.period),
    ],
    datasets: [
      {
        label: 'Historical',
        data: [
          ...data.historical.map(d => d.value),
          ...data.projections.map(() => null),
        ],
        borderColor: '#05bfdb',
        backgroundColor: 'rgba(5, 191, 219, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#05bfdb',
        pointBorderColor: '#05bfdb',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Projected',
        data: [
          ...data.historical.map(() => null),
          ...data.projections.map(p => p.projected),
        ],
        borderColor: '#00ffca',
        borderDash: [5, 5],
        backgroundColor: 'rgba(0, 255, 202, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00ffca',
        pointBorderColor: '#00ffca',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Upper Bound',
        data: [
          ...data.historical.map(() => null),
          ...data.projections.map(p => p.upper_bound),
        ],
        borderColor: 'rgba(0, 255, 202, 0.3)',
        backgroundColor: 'transparent',
        borderDash: [2, 2],
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Lower Bound',
        data: [
          ...data.historical.map(() => null),
          ...data.projections.map(p => p.lower_bound),
        ],
        borderColor: 'rgba(0, 255, 202, 0.3)',
        backgroundColor: 'rgba(0, 255, 202, 0.05)',
        borderDash: [2, 2],
        pointRadius: 0,
        fill: '-1',
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
        },
      },
    },
  } as const;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 w-24 skeleton mb-4"></div>
              <div className="h-8 w-32 skeleton"></div>
            </div>
          ))}
        </div>
        <div className="card h-[500px] skeleton"></div>
      </div>
    );
  }

  const hasData = data && data.historical.length > 0;

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projections</h1>
          <p className="text-slate-400">Forecast future spend based on historical data</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={pharmacyId}
            onChange={(e) => setPharmacyId(e.target.value)}
            className="select !w-auto"
          >
            <option value="">All Pharmacies</option>
            {pharmacies.map((pharmacy) => (
              <option key={pharmacy.id} value={pharmacy.id}>
                {pharmacy.name}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
            className="select !w-auto"
          >
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
          <select
            value={periods}
            onChange={(e) => setPeriods(parseInt(e.target.value))}
            className="select !w-auto"
          >
            <option value="3">3 {period}s ahead</option>
            <option value="6">6 {period}s ahead</option>
            <option value="12">12 {period}s ahead</option>
          </select>
        </div>
      </div>

      {!hasData ? (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-white mb-1">No Data Available</p>
              <p className="text-slate-400 text-sm max-w-md">
                Upload invoice data to generate projections. We need historical data to make accurate forecasts.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                {getTrendIcon(data.metrics.trend)}
                <span className="text-slate-400 text-sm">Trend Direction</span>
              </div>
              <p className={`text-2xl font-bold capitalize ${getTrendColor(data.metrics.trend)}`}>
                {data.metrics.trend === 'up' ? 'Upward' : data.metrics.trend === 'down' ? 'Downward' : 'Stable'}
              </p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span className="text-slate-400 text-sm">Growth Rate</span>
              </div>
              <p className={`text-2xl font-bold ${data.metrics.growth_rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.metrics.growth_rate >= 0 ? '+' : ''}{data.metrics.growth_rate.toFixed(1)}%
              </p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-cyan-400" />
                <span className="text-slate-400 text-sm">Model Confidence</span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-white">
                  {data.metrics.confidence.toFixed(0)}%
                </p>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                    style={{ width: `${data.metrics.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Spend Projection</h3>
            <div className="h-[400px]">
              {chartData && <Line data={chartData} options={chartOptions} />}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Shaded area represents confidence interval (95%)
            </p>
          </div>

          {/* Projection Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Projected Values</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Projected</th>
                    <th className="text-right">Lower Bound</th>
                    <th className="text-right">Upper Bound</th>
                    <th className="text-right">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projections.map((projection) => (
                    <tr key={projection.period}>
                      <td className="font-medium">{projection.period}</td>
                      <td className="text-right text-cyan-400 font-medium">
                        {formatCurrency(projection.projected)}
                      </td>
                      <td className="text-right text-slate-400">
                        {formatCurrency(projection.lower_bound)}
                      </td>
                      <td className="text-right text-slate-400">
                        {formatCurrency(projection.upper_bound)}
                      </td>
                      <td className="text-right text-slate-500 text-sm">
                        ±{formatCurrency((projection.upper_bound - projection.lower_bound) / 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Data */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Historical Data</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Actual Spend</th>
                    <th className="text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {data.historical.map((point, index) => {
                    const prevValue = index > 0 ? data.historical[index - 1].value : null;
                    const change = prevValue ? ((point.value - prevValue) / prevValue) * 100 : null;
                    
                    return (
                      <tr key={point.period}>
                        <td className="font-medium">{point.period}</td>
                        <td className="text-right font-medium">{formatCurrency(point.value)}</td>
                        <td className={`text-right ${
                          change === null ? 'text-slate-500' :
                          change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {change === null ? '-' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

