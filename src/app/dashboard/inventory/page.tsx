'use client';

import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Clock, TrendingUp, RefreshCw, Download } from 'lucide-react';

interface ReorderRecommendation {
  product_name: string;
  avg_daily_demand: number;
  days_supply_pattern: number;
  last_order_date: string;
  estimated_reorder_date: string;
  urgency: 'low' | 'medium' | 'high';
}

const URGENCY_COLORS = {
  high: { bg: 'bg-[#c27272]/10', text: 'text-[#a25555]', border: 'border-[#c27272]' },
  medium: { bg: 'bg-[#d4a853]/10', text: 'text-[#b08a3f]', border: 'border-[#d4a853]' },
  low: { bg: 'bg-[#7c9a82]/10', text: 'text-[#5a7560]', border: 'border-[#7c9a82]' },
};

export default function InventoryPage() {
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reorder');
      if (res.ok) {
        setRecommendations(await res.json());
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredRecommendations = filter === 'all'
    ? recommendations
    : recommendations.filter(r => r.urgency === filter);

  const urgencyCounts = {
    high: recommendations.filter(r => r.urgency === 'high').length,
    medium: recommendations.filter(r => r.urgency === 'medium').length,
    low: recommendations.filter(r => r.urgency === 'low').length,
  };

  const exportRecommendations = () => {
    const headers = ['Product', 'Daily Demand', 'Supply Pattern (days)', 'Last Order', 'Reorder Date', 'Urgency'];
    const rows = filteredRecommendations.map(r => [
      r.product_name,
      r.avg_daily_demand.toFixed(2),
      r.days_supply_pattern,
      r.last_order_date,
      r.estimated_reorder_date,
      r.urgency,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder-recommendations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-24 skeleton"></div>
          ))}
        </div>
        <div className="card">
          <div className="h-64 skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory Forecasting</h1>
          <p className="page-subtitle">Reorder recommendations based on demand patterns</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchData} className="btn btn-secondary text-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button onClick={exportRecommendations} className="btn btn-secondary text-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Urgency Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`card border-l-4 ${URGENCY_COLORS.high.border}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${URGENCY_COLORS.high.bg} flex items-center justify-center`}>
              <AlertTriangle className={`w-6 h-6 ${URGENCY_COLORS.high.text}`} />
            </div>
            <div>
              <p className="text-sm text-[#404040]">High Priority</p>
              <p className={`text-2xl font-semibold ${URGENCY_COLORS.high.text}`}>{urgencyCounts.high}</p>
            </div>
          </div>
          <p className="text-xs text-[#404040] mt-3">Reorder within 7 days</p>
        </div>
        <div className={`card border-l-4 ${URGENCY_COLORS.medium.border}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${URGENCY_COLORS.medium.bg} flex items-center justify-center`}>
              <Clock className={`w-6 h-6 ${URGENCY_COLORS.medium.text}`} />
            </div>
            <div>
              <p className="text-sm text-[#404040]">Medium Priority</p>
              <p className={`text-2xl font-semibold ${URGENCY_COLORS.medium.text}`}>{urgencyCounts.medium}</p>
            </div>
          </div>
          <p className="text-xs text-[#404040] mt-3">Reorder within 21 days</p>
        </div>
        <div className={`card border-l-4 ${URGENCY_COLORS.low.border}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${URGENCY_COLORS.low.bg} flex items-center justify-center`}>
              <TrendingUp className={`w-6 h-6 ${URGENCY_COLORS.low.text}`} />
            </div>
            <div>
              <p className="text-sm text-[#404040]">Low Priority</p>
              <p className={`text-2xl font-semibold ${URGENCY_COLORS.low.text}`}>{urgencyCounts.low}</p>
            </div>
          </div>
          <p className="text-xs text-[#404040] mt-3">No immediate action needed</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#e8e4df]">
        {(['all', 'high', 'medium', 'low'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab
                ? 'border-[#1a1a1a] text-[#1a1a1a]'
                : 'border-transparent text-[#404040] hover:text-[#1a1a1a]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab !== 'all' && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${URGENCY_COLORS[tab].bg} ${URGENCY_COLORS[tab].text}`}>
                {urgencyCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recommendations Table */}
      <div className="card">
        {filteredRecommendations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Daily Demand</th>
                  <th className="text-right">Supply Cycle</th>
                  <th>Last Order</th>
                  <th>Reorder By</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecommendations.map((rec, idx) => {
                  const daysUntil = getDaysUntil(rec.estimated_reorder_date);
                  return (
                    <tr key={idx}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#404040]" />
                          <span className="font-medium">{rec.product_name}</span>
                        </div>
                      </td>
                      <td className="text-right tabular-nums">{rec.avg_daily_demand.toFixed(2)}</td>
                      <td className="text-right tabular-nums">{rec.days_supply_pattern} days</td>
                      <td className="text-[#404040]">{formatDate(rec.last_order_date)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{formatDate(rec.estimated_reorder_date)}</span>
                          {daysUntil <= 7 && (
                            <span className={`text-xs ${URGENCY_COLORS.high.text}`}>
                              ({daysUntil <= 0 ? 'Overdue' : `${daysUntil}d`})
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${URGENCY_COLORS[rec.urgency].bg} ${URGENCY_COLORS[rec.urgency].text}`}>
                          {rec.urgency.charAt(0).toUpperCase() + rec.urgency.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-[#c9b8a8] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">No Recommendations</h3>
            <p className="text-[#404040]">
              {filter === 'all' 
                ? 'Upload more invoice data to generate reorder recommendations'
                : `No ${filter} priority items found`
              }
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="card bg-[#f7f5f2]">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-3">How Recommendations Work</h3>
        <ul className="space-y-2 text-sm text-[#404040]">
          <li className="flex items-start gap-2">
            <span className="text-[#7c9a82]">•</span>
            <span>Recommendations are based on historical order patterns and average demand</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#7c9a82]">•</span>
            <span>Supply cycle assumes an 84-day pattern based on typical compound medication prescriptions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#7c9a82]">•</span>
            <span>High priority items should be reordered within 7 days, medium within 21 days</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#7c9a82]">•</span>
            <span>Upload more data to improve prediction accuracy</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

