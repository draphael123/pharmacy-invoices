'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  DollarSign, 
  Package, 
  Building2, 
  FileText, 
  TrendingUp, 
  TrendingDown,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  total_spend: number;
  total_items: number;
  pharmacy_count: number;
  invoice_count: number;
  this_month_spend: number;
  last_month_spend: number;
  growth_rate: number;
}

interface SpendData {
  period: string;
  total: number;
  count: number;
}

interface TopProduct {
  product_name: string;
  product_code: string | null;
  total_quantity: number;
  total_revenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spendData, setSpendData] = useState<SpendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, spendRes, productsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch(`/api/dashboard/spend?period=${period}`),
        fetch('/api/dashboard/top-products?limit=5'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (spendRes.ok) {
        const spendDataRes = await spendRes.json();
        setSpendData(spendDataRes);
      }
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setTopProducts(productsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const spendChartData = {
    labels: spendData.map(d => d.period),
    datasets: [
      {
        label: 'Total Spend',
        data: spendData.map(d => d.total),
        fill: true,
        borderColor: '#1a1a1a',
        backgroundColor: 'rgba(26, 26, 26, 0.04)',
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: '#1a1a1a',
        pointBorderColor: '#1a1a1a',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const topProductsChartData = {
    labels: topProducts.map(p => p.product_name.length > 25 ? p.product_name.substring(0, 25) + '...' : p.product_name),
    datasets: [
      {
        label: 'Revenue',
        data: topProducts.map(p => p.total_revenue),
        backgroundColor: [
          '#1a1a1a',
          '#404040',
          '#7c9a82',
          '#c9b8a8',
          '#d4a853',
        ],
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#ffffff',
        bodyColor: '#e8e4df',
        padding: 12,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#404040',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: '#e8e4df',
        },
        ticks: {
          color: '#404040',
          font: {
            size: 11,
          },
        },
        border: {
          display: false,
        },
      },
    },
  } as const;

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#ffffff',
        bodyColor: '#e8e4df',
        padding: 12,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#e8e4df',
        },
        ticks: {
          color: '#404040',
          font: {
            size: 11,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#404040',
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 w-24 skeleton mb-4"></div>
              <div className="h-8 w-32 skeleton"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Spend',
      value: formatCurrency(stats?.total_spend || 0),
      icon: DollarSign,
      accent: 'bg-[#1a1a1a]',
    },
    {
      label: 'Items Sold',
      value: formatNumber(stats?.total_items || 0),
      icon: Package,
      accent: 'bg-[#7c9a82]',
    },
    {
      label: 'Pharmacies',
      value: formatNumber(stats?.pharmacy_count || 0),
      icon: Building2,
      accent: 'bg-[#d4a853]',
    },
    {
      label: 'Invoices',
      value: formatNumber(stats?.invoice_count || 0),
      icon: FileText,
      accent: 'bg-[#c9b8a8]',
    },
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Track pharmacy spend and product demand</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
          className="select !w-auto text-sm"
        >
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => (
          <div 
            key={stat.label} 
            className={`card slide-up stagger-${index + 1}`}
            style={{ animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.accent} flex items-center justify-center`}>
                <stat.icon className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
              </div>
              <span className="stat-label">{stat.label}</span>
            </div>
            <p className="stat-value tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Growth Card */}
      {stats && (
        <div className="card flex items-center gap-6">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            stats.growth_rate >= 0 ? 'bg-[#7c9a82]/10' : 'bg-[#c27272]/10'
          }`}>
            {stats.growth_rate >= 0 ? (
              <TrendingUp className={`w-5 h-5 ${stats.growth_rate >= 0 ? 'text-[#5a7560]' : 'text-[#c27272]'}`} />
            ) : (
              <TrendingDown className="w-5 h-5 text-[#c27272]" />
            )}
          </div>
          <div>
            <p className="text-sm text-[#404040]">Month-over-Month</p>
            <p className={`text-xl font-semibold tabular-nums ${stats.growth_rate >= 0 ? 'text-[#5a7560]' : 'text-[#c27272]'}`}>
              {stats.growth_rate >= 0 ? '+' : ''}{stats.growth_rate.toFixed(1)}%
            </p>
          </div>
          <div className="ml-auto flex gap-8">
            <div className="text-right">
              <p className="text-sm text-[#404040]">This Month</p>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(stats.this_month_spend)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#404040]">Last Month</p>
              <p className="text-lg tabular-nums text-[#404040]">{formatCurrency(stats.last_month_spend)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Spend Trend</h3>
          <div className="chart-container">
            {spendData.length > 0 ? (
              <Line data={spendChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-[#404040]">
                <p className="text-sm">Upload invoices to see trends</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Top Products</h3>
          <div className="chart-container">
            {topProducts.length > 0 ? (
              <Bar data={topProductsChartData} options={barChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-[#404040]">
                <p className="text-sm">Upload invoices to see products</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      {topProducts.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Top Performing Products</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="font-medium">{product.product_name}</td>
                    <td className="text-[#404040] font-mono text-sm">{product.product_code || '—'}</td>
                    <td className="text-right tabular-nums">{formatNumber(product.total_quantity)}</td>
                    <td className="text-right font-medium tabular-nums">
                      {formatCurrency(product.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
