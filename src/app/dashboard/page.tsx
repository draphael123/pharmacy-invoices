'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  DollarSign, 
  Package, 
  Building2, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight 
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
        borderColor: '#05bfdb',
        backgroundColor: 'rgba(5, 191, 219, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#05bfdb',
        pointBorderColor: '#05bfdb',
        pointHoverBackgroundColor: '#00ffca',
        pointHoverBorderColor: '#00ffca',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const topProductsChartData = {
    labels: topProducts.map(p => p.product_name.length > 20 ? p.product_name.substring(0, 20) + '...' : p.product_name),
    datasets: [
      {
        label: 'Revenue',
        data: topProducts.map(p => p.total_revenue),
        backgroundColor: [
          'rgba(5, 191, 219, 0.8)',
          'rgba(0, 255, 202, 0.8)',
          'rgba(8, 131, 149, 0.8)',
          'rgba(10, 77, 104, 0.8)',
          'rgba(51, 65, 85, 0.8)',
        ],
        borderRadius: 8,
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
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
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

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
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
          display: false,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-4 w-24 skeleton mb-4"></div>
              <div className="h-8 w-32 skeleton"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-96 skeleton"></div>
          <div className="card h-96 skeleton"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Spend',
      value: formatCurrency(stats?.total_spend || 0),
      icon: DollarSign,
      color: 'from-cyan-500 to-teal-500',
      shadowColor: 'shadow-cyan-500/30',
    },
    {
      label: 'Total Items',
      value: formatNumber(stats?.total_items || 0),
      icon: Package,
      color: 'from-emerald-500 to-green-500',
      shadowColor: 'shadow-emerald-500/30',
    },
    {
      label: 'Pharmacies',
      value: formatNumber(stats?.pharmacy_count || 0),
      icon: Building2,
      color: 'from-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-500/30',
    },
    {
      label: 'Invoices',
      value: formatNumber(stats?.invoice_count || 0),
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/30',
    },
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Overview of pharmacy invoice data and projections</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
            className="select !w-auto"
          >
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={stat.label} 
            className={`card slide-up stagger-${index + 1}`}
            style={{ animationFillMode: 'backwards' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadowColor}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              {stat.label === 'Total Spend' && stats && (
                <div className={`flex items-center gap-1 text-sm ${stats.growth_rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.growth_rate >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{Math.abs(stats.growth_rate).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <p className="stat-label mb-1">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Growth Card */}
      {stats && (
        <div className="card slide-up stagger-5" style={{ animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              stats.growth_rate >= 0 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {stats.growth_rate >= 0 ? (
                <TrendingUp className="w-7 h-7" />
              ) : (
                <TrendingDown className="w-7 h-7" />
              )}
            </div>
            <div>
              <p className="text-slate-400 text-sm">Month-over-Month Growth</p>
              <p className={`text-2xl font-bold ${stats.growth_rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.growth_rate >= 0 ? '+' : ''}{stats.growth_rate.toFixed(1)}%
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-slate-400 text-sm">This Month</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(stats.this_month_spend)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Last Month</p>
              <p className="text-lg font-semibold text-slate-300">{formatCurrency(stats.last_month_spend)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Spend Over Time</h3>
          <div className="chart-container">
            {spendData.length > 0 ? (
              <Line data={spendChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p>No data available. Upload invoices to see trends.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Top Products by Revenue</h3>
          <div className="chart-container">
            {topProducts.length > 0 ? (
              <Bar data={topProductsChartData} options={barChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p>No data available. Upload invoices to see products.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      {topProducts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Top Performing Products</h3>
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
                    <td className="text-slate-400">{product.product_code || '-'}</td>
                    <td className="text-right">{formatNumber(product.total_quantity)}</td>
                    <td className="text-right font-medium text-cyan-400">
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

