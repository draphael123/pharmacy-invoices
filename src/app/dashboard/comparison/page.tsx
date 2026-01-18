'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, Download, Building2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PharmacyComparison {
  pharmacy_id: number;
  pharmacy_name: string;
  total_spend: number;
  total_items: number;
  invoice_count: number;
  avg_order_value: number;
  top_category: string;
  growth_rate: number;
}

interface SpendData {
  period: string;
  total: number;
  count: number;
}

export default function ComparisonPage() {
  const [comparison, setComparison] = useState<PharmacyComparison[]>([]);
  const [trendData, setTrendData] = useState<Map<number, SpendData[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPharmacies, setSelectedPharmacies] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/comparison${queryStr}`);
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
        
        // Set initial selection to top 5 pharmacies
        if (data.length > 0 && selectedPharmacies.length === 0) {
          setSelectedPharmacies(data.slice(0, 5).map((p: PharmacyComparison) => p.pharmacy_id));
        }
        
        // Fetch trend data for each pharmacy
        const trends = new Map<number, SpendData[]>();
        for (const pharmacy of data.slice(0, 5)) {
          const trendRes = await fetch(`/api/dashboard/spend?period=month&pharmacy_id=${pharmacy.pharmacy_id}${queryStr ? '&' + params.toString() : ''}`);
          if (trendRes.ok) {
            trends.set(pharmacy.pharmacy_id, await trendRes.json());
          }
        }
        setTrendData(trends);
      }
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPharmacies.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (dateRange.start) params.append('start_date', dateRange.start);
    if (dateRange.end) params.append('end_date', dateRange.end);
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

  const togglePharmacy = (id: number) => {
    if (selectedPharmacies.includes(id)) {
      setSelectedPharmacies(selectedPharmacies.filter(p => p !== id));
    } else if (selectedPharmacies.length < 5) {
      setSelectedPharmacies([...selectedPharmacies, id]);
    }
  };

  const PHARMACY_COLORS = ['#1a1a1a', '#7c9a82', '#d4a853', '#8b5cf6', '#ec4899'];

  // Bar chart data
  const barChartData = {
    labels: comparison.filter(p => selectedPharmacies.includes(p.pharmacy_id)).map(p => p.pharmacy_name),
    datasets: [
      {
        label: 'Total Spend',
        data: comparison.filter(p => selectedPharmacies.includes(p.pharmacy_id)).map(p => p.total_spend),
        backgroundColor: PHARMACY_COLORS,
        borderRadius: 4,
      },
    ],
  };

  const itemsChartData = {
    labels: comparison.filter(p => selectedPharmacies.includes(p.pharmacy_id)).map(p => p.pharmacy_name),
    datasets: [
      {
        label: 'Total Items',
        data: comparison.filter(p => selectedPharmacies.includes(p.pharmacy_id)).map(p => p.total_items),
        backgroundColor: PHARMACY_COLORS,
        borderRadius: 4,
      },
    ],
  };

  // Trend chart data
  const allPeriods = new Set<string>();
  trendData.forEach(data => data.forEach(d => allPeriods.add(d.period)));
  const sortedPeriods = Array.from(allPeriods).sort();

  const trendChartData = {
    labels: sortedPeriods,
    datasets: comparison
      .filter(p => selectedPharmacies.includes(p.pharmacy_id))
      .slice(0, 5)
      .map((pharmacy, idx) => ({
        label: pharmacy.pharmacy_name,
        data: sortedPeriods.map(period => {
          const pharmacyData = trendData.get(pharmacy.pharmacy_id);
          const dataPoint = pharmacyData?.find(d => d.period === period);
          return dataPoint?.total || 0;
        }),
        borderColor: PHARMACY_COLORS[idx],
        backgroundColor: `${PHARMACY_COLORS[idx]}20`,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      })),
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

  const trendOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: true, position: 'top' as const, labels: { color: '#404040', font: { size: 11 }, padding: 12 } },
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

  const totalSpend = comparison.reduce((sum, p) => sum + p.total_spend, 0);
  const totalItems = comparison.reduce((sum, p) => sum + p.total_items, 0);
  const avgOrderValue = comparison.length > 0 
    ? comparison.reduce((sum, p) => sum + p.avg_order_value, 0) / comparison.length 
    : 0;

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Pharmacy Comparison</h1>
          <p className="page-subtitle">Compare performance across pharmacies</p>
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
          <button onClick={() => setDateRange({ start: '', end: '' })} className="btn btn-secondary text-sm">
            Clear
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#7c9a82]/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#7c9a82]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Pharmacies</p>
            <p className="text-2xl font-semibold">{comparison.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#1a1a1a]/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-[#1a1a1a]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Total Spend</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalSpend)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#d4a853]/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#d4a853]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Total Items</p>
            <p className="text-2xl font-semibold">{formatNumber(totalItems)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Avg Order Value</p>
            <p className="text-2xl font-semibold">{formatCurrency(avgOrderValue)}</p>
          </div>
        </div>
      </div>

      {/* Pharmacy Selection */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">Select Pharmacies to Compare (max 5)</h3>
        <div className="flex flex-wrap gap-2">
          {comparison.map((pharmacy, idx) => (
            <button
              key={pharmacy.pharmacy_id}
              onClick={() => togglePharmacy(pharmacy.pharmacy_id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedPharmacies.includes(pharmacy.pharmacy_id)
                  ? 'text-white'
                  : 'bg-[#f7f5f2] text-[#404040] hover:bg-[#e8e4df]'
              }`}
              style={{
                backgroundColor: selectedPharmacies.includes(pharmacy.pharmacy_id)
                  ? PHARMACY_COLORS[selectedPharmacies.indexOf(pharmacy.pharmacy_id)] || '#6b7280'
                  : undefined,
              }}
            >
              {pharmacy.pharmacy_name}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Spend by Pharmacy</h3>
          <div className="h-[280px]">
            {comparison.length > 0 ? (
              <Bar data={barChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-[#404040]">No data available</div>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Items by Pharmacy</h3>
          <div className="h-[280px]">
            {comparison.length > 0 ? (
              <Bar data={itemsChartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-[#404040]">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Comparison */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Monthly Spend Trends</h3>
        <div className="chart-container">
          {trendData.size > 0 ? (
            <Line data={trendChartData} options={trendOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-[#404040]">No trend data available</div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Detailed Comparison</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Pharmacy</th>
                <th className="text-right">Total Spend</th>
                <th className="text-right">Items</th>
                <th className="text-right">Invoices</th>
                <th className="text-right">Avg Order</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((pharmacy, idx) => (
                <tr key={pharmacy.pharmacy_id} className={selectedPharmacies.includes(pharmacy.pharmacy_id) ? 'bg-[#f7f5f2]' : ''}>
                  <td>
                    <div className="flex items-center gap-2">
                      {selectedPharmacies.includes(pharmacy.pharmacy_id) && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PHARMACY_COLORS[selectedPharmacies.indexOf(pharmacy.pharmacy_id)] }}
                        />
                      )}
                      <span className="font-medium">{pharmacy.pharmacy_name}</span>
                    </div>
                  </td>
                  <td className="text-right font-medium tabular-nums">{formatCurrency(pharmacy.total_spend)}</td>
                  <td className="text-right tabular-nums">{formatNumber(pharmacy.total_items)}</td>
                  <td className="text-right tabular-nums">{pharmacy.invoice_count}</td>
                  <td className="text-right tabular-nums">{formatCurrency(pharmacy.avg_order_value)}</td>
                  <td className="text-right tabular-nums">
                    {totalSpend > 0 ? ((pharmacy.total_spend / totalSpend) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

