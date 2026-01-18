'use client';

import { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, Loader2, Shield, Info, RefreshCw } from 'lucide-react';

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
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Configure your pharmacy projection system</p>
      </div>

      {/* Database Setup */}
      <div className="card">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Database Setup</h3>
            <p className="text-slate-400 text-sm">
              Initialize or reset your database tables. This creates the necessary tables for storing pharmacy data, invoices, and line items.
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            This will create:
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span><strong className="text-white">pharmacies</strong> - Store pharmacy partner information</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span><strong className="text-white">invoices</strong> - Track uploaded invoice records</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span><strong className="text-white">line_items</strong> - Individual product line items from invoices</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span><strong className="text-white">users</strong> - User accounts (for future authentication)</span>
            </li>
          </ul>
        </div>

        {/* Status Messages */}
        {setupStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 mb-6">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {setupStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{message}</p>
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
              <RefreshCw className="w-4 h-4 mr-2" />
              Setup Database
            </>
          )}
        </button>
      </div>

      {/* Environment Info */}
      <div className="card">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Environment</h3>
            <p className="text-slate-400 text-sm">
              System configuration and environment details
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
            <span className="text-slate-400">Platform</span>
            <span className="text-white font-medium">Vercel</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
            <span className="text-slate-400">Framework</span>
            <span className="text-white font-medium">Next.js 14</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
            <span className="text-slate-400">Database</span>
            <span className="text-white font-medium">Vercel Postgres</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
            <span className="text-slate-400">Authentication</span>
            <span className="badge badge-info">Public Access</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">Data Persistence</span>
            <span className="badge badge-success">Permanent</span>
          </div>
        </div>
      </div>

      {/* Usage Guide */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Start Guide</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-sm">
              1
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Setup Database</h4>
              <p className="text-slate-400 text-sm">
                Click the &quot;Setup Database&quot; button above to create the necessary tables.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-sm">
              2
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Upload Invoice Data</h4>
              <p className="text-slate-400 text-sm">
                Go to the Upload page and import CSV files from your pharmacy partners.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-sm">
              3
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">View Dashboard</h4>
              <p className="text-slate-400 text-sm">
                Check the Dashboard for KPIs, spend trends, and top products.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-sm">
              4
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Generate Projections</h4>
              <p className="text-slate-400 text-sm">
                Use the Projections page to forecast future spend based on historical data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Format */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Expected CSV Format</h3>
        <p className="text-slate-400 text-sm mb-4">
          Your CSV files should contain at minimum: date, product name, and total price columns. 
          The system auto-detects common column name variations.
        </p>
        <div className="bg-slate-900/50 rounded-xl p-4 overflow-x-auto">
          <code className="text-sm text-cyan-400 whitespace-pre">
{`date,product_name,product_code,quantity,unit_price,total
2024-01-15,Aspirin 100mg,ASP100,50,2.50,125.00
2024-01-15,Ibuprofen 200mg,IBU200,30,3.00,90.00
2024-01-16,Amoxicillin 500mg,AMX500,25,8.00,200.00`}
          </code>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Supported date formats: YYYY-MM-DD, MM/DD/YYYY, MM/DD/YY
        </p>
      </div>
    </div>
  );
}

