'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, TrendingUp, TrendingDown, FileText, DollarSign } from 'lucide-react';

interface PharmacyWithStats {
  id: number;
  name: string;
  code: string | null;
  created_at: string;
  total_spend: number;
  invoice_count: number;
  growth_rate: number;
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPharmacy, setNewPharmacy] = useState({ name: '', code: '' });
  const [adding, setAdding] = useState(false);

  const fetchPharmacies = useCallback(async () => {
    try {
      const response = await fetch('/api/pharmacies?include_stats=true');
      if (response.ok) {
        const data = await response.json();
        setPharmacies(data);
      }
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  const handleAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmacy.name.trim()) return;

    setAdding(true);
    try {
      const response = await fetch('/api/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPharmacy),
      });

      if (response.ok) {
        setNewPharmacy({ name: '', code: '' });
        setShowAddForm(false);
        fetchPharmacies();
      }
    } catch (error) {
      console.error('Error adding pharmacy:', error);
    } finally {
      setAdding(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="card">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-slate-700 last:border-0">
              <div className="w-12 h-12 skeleton rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 w-32 skeleton mb-2"></div>
                <div className="h-3 w-24 skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pharmacies</h1>
          <p className="text-slate-400">Manage your pharmacy partners</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Pharmacy
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card slide-up">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Pharmacy</h3>
          <form onSubmit={handleAddPharmacy} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Pharmacy Name *
              </label>
              <input
                type="text"
                value={newPharmacy.name}
                onChange={(e) => setNewPharmacy({ ...newPharmacy, name: e.target.value })}
                placeholder="Enter pharmacy name"
                className="input"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Code (Optional)
              </label>
              <input
                type="text"
                value={newPharmacy.code}
                onChange={(e) => setNewPharmacy({ ...newPharmacy, code: e.target.value })}
                placeholder="Enter pharmacy code"
                className="input"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !newPharmacy.name.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-slate-400 text-sm">Total Pharmacies</span>
          </div>
          <p className="text-3xl font-bold text-white">{pharmacies.length}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-sm">Total Spend</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(pharmacies.reduce((sum, p) => sum + p.total_spend, 0))}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">Total Invoices</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {pharmacies.reduce((sum, p) => sum + p.invoice_count, 0)}
          </p>
        </div>
      </div>

      {/* Pharmacies List */}
      {pharmacies.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-white mb-1">No Pharmacies Yet</p>
              <p className="text-slate-400 text-sm">
                Add a pharmacy manually or upload invoice data to get started.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Pharmacy</th>
                <th>Code</th>
                <th className="text-right">Total Spend</th>
                <th className="text-right">Invoices</th>
                <th className="text-right">Growth</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {pharmacies.map((pharmacy) => (
                <tr key={pharmacy.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="font-medium">{pharmacy.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-400">{pharmacy.code || '-'}</td>
                  <td className="text-right font-medium text-cyan-400">
                    {formatCurrency(pharmacy.total_spend)}
                  </td>
                  <td className="text-right">{pharmacy.invoice_count}</td>
                  <td className="text-right">
                    <div className={`inline-flex items-center gap-1 ${
                      pharmacy.growth_rate >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {pharmacy.growth_rate >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{Math.abs(pharmacy.growth_rate).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="text-slate-400 text-sm">
                    {formatDate(pharmacy.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

