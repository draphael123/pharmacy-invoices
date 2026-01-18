'use client';

import { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [setupStatus, setSetupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetupDatabase = async () => {
    setSetupStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSetupStatus('success');
        setMessage(data.message || 'Database setup complete!');
      } else {
        throw new Error(data.error || 'Failed to setup database');
      }
    } catch (error) {
      setSetupStatus('error');
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your system</p>
      </div>

      {/* Database Setup */}
      <div className="card">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">Database Setup</h3>
            <p className="text-sm text-[#404040]">
              Initialize database tables for pharmacies, invoices, and line items.
            </p>
          </div>
        </div>

        <div className="bg-[#f7f5f2] rounded-lg p-4 mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[#404040] mb-3">Creates tables:</p>
          <div className="flex flex-wrap gap-2">
            {['pharmacies', 'invoices', 'line_items', 'users'].map((table) => (
              <span key={table} className="px-2.5 py-1 bg-white rounded text-sm font-mono text-[#1a1a1a]">
                {table}
              </span>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        {setupStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-[#7c9a82]/10 border border-[#7c9a82]/20 rounded-lg text-[#5a7560] mb-6">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {setupStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-[#c27272]/10 border border-[#c27272]/20 rounded-lg text-[#a05555] mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        <button
          onClick={handleSetupDatabase}
          disabled={setupStatus === 'loading'}
          className="btn btn-primary disabled:opacity-50"
        >
          {setupStatus === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.75} />
              Setup Database
            </>
          )}
        </button>
      </div>

      {/* Environment Info */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Environment</h3>
        <div className="space-y-0 divide-y divide-[#e8e4df]">
          {[
            { label: 'Platform', value: 'Vercel' },
            { label: 'Framework', value: 'Next.js 14' },
            { label: 'Database', value: 'Neon Postgres' },
            { label: 'Authentication', value: 'Public', badge: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-[#404040]">{item.label}</span>
              {item.badge ? (
                <span className="badge badge-info">{item.value}</span>
              ) : (
                <span className="text-sm font-medium">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-5">Quick Start</h3>
        <div className="space-y-4">
          {[
            { step: 1, title: 'Setup Database', desc: 'Click the button above to create tables' },
            { step: 2, title: 'Upload Data', desc: 'Import CSV files from pharmacy partners' },
            { step: 3, title: 'View Analytics', desc: 'Check dashboard for KPIs and trends' },
            { step: 4, title: 'Projections', desc: 'Forecast future spend and demand' },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#f7f5f2] border border-[#e8e4df] flex items-center justify-center flex-shrink-0 text-sm font-medium text-[#404040]">
                {item.step}
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#1a1a1a]">{item.title}</h4>
                <p className="text-sm text-[#404040]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSV Format */}
      <div className="card">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">CSV Format</h3>
        <p className="text-sm text-[#404040] mb-4">
          Required columns: date, product name, total price. Optional: product code, quantity, unit price.
        </p>
        <div className="bg-[#1a1a1a] rounded-lg p-4 overflow-x-auto">
          <code className="text-sm text-[#e8e4df] whitespace-pre font-mono">
{`date,product_name,product_code,quantity,unit_price,total
2024-01-15,Aspirin 100mg,ASP100,50,2.50,125.00
2024-01-15,Ibuprofen 200mg,IBU200,30,3.00,90.00`}
          </code>
        </div>
      </div>
    </div>
  );
}
