'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, X, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface Alert {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  product_name: string | null;
  pharmacy_id: number | null;
  threshold_value: number | null;
  actual_value: number | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

const SEVERITY_STYLES = {
  info: { bg: 'bg-[#3b82f6]/10', text: 'text-[#2563eb]', icon: Bell },
  warning: { bg: 'bg-[#d4a853]/10', text: 'text-[#b08a3f]', icon: AlertTriangle },
  critical: { bg: 'bg-[#c27272]/10', text: 'text-[#a25555]', icon: AlertTriangle },
  success: { bg: 'bg-[#7c9a82]/10', text: 'text-[#5a7560]', icon: CheckCircle },
};

const TYPE_ICONS = {
  demand_spike: TrendingUp,
  demand_drop: TrendingDown,
  reorder_alert: Bell,
  default: Bell,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [detecting, setDetecting] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/alerts${filter === 'unread' ? '?unread_only=true' : ''}`);
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const runDetection = async () => {
    setDetecting(true);
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detect' }),
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Error running detection:', error);
    } finally {
      setDetecting(false);
    }
  };

  const markAsRead = async (id: number) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', id }),
    });
    setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const dismissAlert = async (id: number) => {
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', id }),
    });
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-20 skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Anomaly detection and demand notifications</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runDetection}
            disabled={detecting}
            className="btn btn-primary text-sm"
          >
            {detecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Detecting...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Detection
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Total Alerts</p>
            <p className="text-2xl font-semibold">{alerts.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#d4a853]/10 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-[#d4a853]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Unread</p>
            <p className="text-2xl font-semibold">{unreadCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#c27272]/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#c27272]" />
          </div>
          <div>
            <p className="text-sm text-[#404040]">Critical</p>
            <p className="text-2xl font-semibold">{alerts.filter(a => a.severity === 'critical').length}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#e8e4df]">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-[#1a1a1a] text-[#1a1a1a]'
              : 'border-transparent text-[#404040] hover:text-[#1a1a1a]'
          }`}
        >
          All Alerts
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-[#1a1a1a] text-[#1a1a1a]'
              : 'border-transparent text-[#404040] hover:text-[#1a1a1a]'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#c27272]/10 text-[#a25555] rounded text-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length > 0 ? (
          alerts.map((alert) => {
            const severity = SEVERITY_STYLES[alert.severity as keyof typeof SEVERITY_STYLES] || SEVERITY_STYLES.info;
            const TypeIcon = TYPE_ICONS[alert.type as keyof typeof TYPE_ICONS] || TYPE_ICONS.default;
            
            return (
              <div
                key={alert.id}
                className={`card flex items-start gap-4 ${!alert.is_read ? 'border-l-4 border-l-[#3b82f6]' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg ${severity.bg} flex items-center justify-center flex-shrink-0`}>
                  <TypeIcon className={`w-5 h-5 ${severity.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-[#1a1a1a]">{alert.title}</h3>
                      {alert.message && (
                        <p className="text-sm text-[#404040] mt-1">{alert.message}</p>
                      )}
                      {alert.product_name && (
                        <p className="text-xs text-[#404040] mt-2">
                          Product: <span className="font-medium">{alert.product_name}</span>
                        </p>
                      )}
                      {alert.threshold_value && alert.actual_value && (
                        <p className="text-xs text-[#404040] mt-1">
                          Threshold: {alert.threshold_value.toFixed(0)} → Actual: {alert.actual_value.toFixed(0)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-[#404040]">{formatDate(alert.created_at)}</span>
                      {!alert.is_read && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="text-[#404040] hover:text-[#1a1a1a] p-1"
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-[#404040] hover:text-[#c27272] p-1"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card text-center py-12">
            <Bell className="w-12 h-12 text-[#c9b8a8] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">No Alerts</h3>
            <p className="text-[#404040] mb-4">
              {filter === 'unread' 
                ? "You're all caught up!"
                : "Run anomaly detection to check for demand spikes or unusual patterns"
              }
            </p>
            <button onClick={runDetection} className="btn btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Detection
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="card bg-[#f7f5f2]">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-3">Alert Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-[#d4a853] mt-0.5" />
            <div>
              <p className="font-medium text-[#1a1a1a]">Demand Spike</p>
              <p className="text-[#404040]">Product demand increased 50%+ above average</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingDown className="w-5 h-5 text-[#c27272] mt-0.5" />
            <div>
              <p className="font-medium text-[#1a1a1a]">Demand Drop</p>
              <p className="text-[#404040]">Product demand decreased 50%+ below average</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

