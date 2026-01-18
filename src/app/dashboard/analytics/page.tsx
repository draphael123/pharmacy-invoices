'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, Download, TrendingUp, Package, Layers } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CategoryStat {
  category: string;
  total_quantity: number;
  total_revenue: number;
  product_count: number;
}

interface SeasonalTrend {
  month: number;
  month_name: string;
  avg_quantity: number;
  avg_spend: number;
}

interface TopProduct {
  product_name: string;
  product_code: string | null;
  total_quantity: number;
  total_revenue: number;
  category: string;
}

interface Pharmacy {
  id: number;
  name: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Testosterone': '#3b82f6',
  'ED Medications': '#8b5cf6',
  'Hormone Therapy': '#ec4899',
  'Anti-Estrogen': '#f59e0b',
  'Hair Loss': '#10b981',
  'Skincare': '#06b6d4',
  'Cardiovascular': '#ef4444',
  'Other': '#6b7280',
};

export default function AnalyticsPage() {
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [seasonalTrends, setSeasonalTrends] = useState<SeasonalTrend[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      if (selectedPharmacy) params.append('pharmacy_id', selectedPharmacy);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const [catRes, seasonRes, productsRes, pharmacyRes] = await Promise.all([
        fetch(`/api/categories?include_stats=true${queryStr ? '&' + params.toString() : ''}`),
        fetch('/api/seasonal'),
        fetch(`/api/dashboard/top-products?limit=20${queryStr ? '&' + params.toString() : ''}`),
        fetch('/api/pharmacies'),
      ]);

      if (catRes.ok) setCategoryStats(await catRes.json());
      if (seasonRes.ok) setSeasonalTrends(await seasonRes.json());
      if (productsRes.ok) setTopProducts(await productsRes.json());
      if (pharmacyRes.ok) setPharmacies(await pharmacyRes.json());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPharmacy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (dateRange.start) params.append('start_date', dateRange.start);
    if (dateRange.end) params.append('end_date', dateRange.end);
    if (selectedPharmacy) params.append('pharmacy_id', selectedPharmacy);
    if (selectedCategory) params.append('category', selectedCategory);
    window.location.href = `/api/export?${params.toString()}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const filteredProducts = selectedCategory
    ? topProducts.filter(p => p.category === selectedCategory)
    : topProducts;

  // Chart data
  const categoryChartData = {
    labels: categoryStats.map(c => c.category),
    datasets: [{
      data: categoryStats.map(c => c.total_revenue),
      backgroundColor: categoryStats.map(c => CATEGORY_COLORS[c.category] || '#6b7280'),
      borderWidth: 0,
    }],
  };

  const categoryBarData = {
    labels: categoryStats.map(c => c.category),
    datasets: [{
      label: 'Total Quantity',
      data: categoryStats.map(c => c.total_quantity),
      backgroundColor: categoryStats.map(c => CATEGORY_COLORS[c.category] || '#6b7280'),
      borderRadius: 4,
    }],
  };

  const seasonalChartData = {
    labels: seasonalTrends.map(t => t.month_name),
    datasets: [
      {
        label: 'Average Spend',
        data: seasonalTrends.map(t => t.avg_spend),
        fill: true,
        borderColor: '#1a1a1a',
        backgroundColor: 'rgba(26, 26, 26, 0.04)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Average Quantity',
        data: seasonalTrends.map(t => t.avg_quantity),
        fill: false,
        borderColor: '#7c9a82',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#ffffff',
        bodyColor: '#e8e4df',
        padding: 12,
        cornerRadius: 6,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#404040', font: { size: 11 } } },
      y: { grid: { color: '#e8e4df' }, ticks: { color: '#404040', font: { size: 11 } }, border: { display: false } },
    },
  } as const;

  const seasonalOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: true, position: 'top' as const },
    },
    scales: {
      x: chartOptions.scales.x,
      y: {
        ...chartOptions.scales.y,
        position: 'left' as const,
        title: { display: true, text: 'Spend ($)', color: '#404040' },
      },
      y1: {
        ...chartOptions.scales.y,
        position: 'right' as const,
        grid: { display: false },
        title: { display: true, text: 'Quantity', color: '#7c9a82' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { color: '#404040', font: { size: 11 }, padding: 10 } },
      tooltip: { backgroundColor: '#1a1a1a', titleColor: '#ffffff', bodyColor: '#e8e4df', padding: 12, cornerRadius: 6 },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-64 skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Category breakdown and seasonal trends</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary text-sm ${showFilters ? 'border-[#7c9a82]' : ''}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button onClick={handleExport} className="btn btn-secondary text-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-[#404040] mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input !w-auto text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404040] mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="input !w-auto text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404040] mb-1">Pharmacy</label>
            <select
              value={selectedPharmacy}
              onChange={(e) => setSelectedPharmacy(e.target.value)}
              className="select !w-auto text-sm"
            >
              <option value="">All Pharmacies</option>
              {pharmacies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404040] mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select !w-auto text-sm"
            >
              <option value="">All Categories</option>
              {categoryStats.map(c => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>
          <button onClick={() => { setDateRange({ start: '', end: '' }); setSelectedPharmacy(''); setSelectedCategory(''); }} className="btn btn-secondary text-sm">
            Clear
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#7c9a82]/10 flex items-center justify-center">
            <Layers className="w-6 h-6 text-[#7c9a82]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Categories</p>
            <p className="text-2xl font-semibold">{categoryStats.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#d4a853]/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-[#d4a853]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Total Products</p>
            <p className="text-2xl font-semibold">{categoryStats.reduce((sum, c) => sum + c.product_count, 0)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#1a1a1a]/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#1a1a1a]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Total Revenue</p>
            <p className="text-2xl font-semibold">{formatCurrency(categoryStats.reduce((sum, c) => sum + c.total_revenue, 0))}</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Revenue by Category</h3>
          <div className="h-[280px]">
            {categoryStats.length > 0 ? (
              <Doughnut data={categoryChartData} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-[#404040]">No data available</div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Quantity by Category</h3>
          <div className="h-[280px]">
            {categoryStats.length > 0 ? (
              <Bar data={categoryBarData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-[#404040]">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Trends */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Seasonal Trends</h3>
        <div className="chart-container">
          {seasonalTrends.length > 0 ? (
            <Line data={seasonalChartData} options={seasonalOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-[#404040]">Need more historical data for seasonal analysis</div>
          )}
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Category Performance</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Products</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Avg/Product</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((cat) => (
                <tr key={cat.category}>
                  <td>
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[cat.category] || '#6b7280'}15`,
                        color: CATEGORY_COLORS[cat.category] || '#6b7280',
                      }}
                    >
                      {cat.category}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{cat.product_count}</td>
                  <td className="text-right tabular-nums">{formatNumber(cat.total_quantity)}</td>
                  <td className="text-right font-medium tabular-nums">{formatCurrency(cat.total_revenue)}</td>
                  <td className="text-right tabular-nums">{formatCurrency(cat.total_revenue / cat.product_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">
          {selectedCategory ? `${selectedCategory} Products` : 'All Products'}
        </h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.slice(0, 15).map((product, i) => (
                <tr key={i}>
                  <td className="font-medium">{product.product_name}</td>
                  <td>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[product.category] || '#6b7280'}15`,
                        color: CATEGORY_COLORS[product.category] || '#6b7280',
                      }}
                    >
                      {product.category}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{formatNumber(product.total_quantity)}</td>
                  <td className="text-right font-medium tabular-nums">{formatCurrency(product.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

