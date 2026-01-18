'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Search, ArrowUpDown, DollarSign, Hash, Calendar } from 'lucide-react';

interface Product {
  product_name: string;
  product_code: string | null;
  total_quantity: number;
  total_revenue: number;
  avg_unit_price: number;
  first_seen: string;
  last_seen: string;
}

type SortField = 'product_name' | 'total_quantity' | 'total_revenue' | 'avg_unit_price';
type SortOrder = 'asc' | 'desc';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let result = [...products];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.product_name.toLowerCase().includes(query) ||
          (p.product_code && p.product_code.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortField] ?? '';
      let bVal: string | number = b[sortField] ?? '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    setFilteredProducts(result);
  }, [products, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 hover:text-cyan-400 transition-colors ${
        sortField === field ? 'text-cyan-400' : ''
      }`}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton"></div>
        <div className="card">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-slate-700 last:border-0">
              <div className="w-10 h-10 skeleton rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 w-48 skeleton mb-2"></div>
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
        <p className="text-slate-400">Browse and analyze product performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-slate-400 text-sm">Total Products</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(products.length)}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-sm">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(products.reduce((sum, p) => sum + p.total_revenue, 0))}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">Total Quantity</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatNumber(products.reduce((sum, p) => sum + p.total_quantity, 0))}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-slate-400 text-sm">Avg Unit Price</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(
              products.length > 0
                ? products.reduce((sum, p) => sum + p.avg_unit_price, 0) / products.length
                : 0
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or code..."
            className="input !pl-12"
          />
        </div>
      </div>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-white mb-1">
                {searchQuery ? 'No Products Found' : 'No Products Yet'}
              </p>
              <p className="text-slate-400 text-sm">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Upload invoice data to see product information'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <SortButton field="product_name" label="Product" />
                  </th>
                  <th>Code</th>
                  <th className="text-right">
                    <SortButton field="total_quantity" label="Quantity" />
                  </th>
                  <th className="text-right">
                    <SortButton field="total_revenue" label="Revenue" />
                  </th>
                  <th className="text-right">
                    <SortButton field="avg_unit_price" label="Avg Price" />
                  </th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <tr key={`${product.product_name}-${product.product_code}-${index}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <Package className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="font-medium max-w-[250px] truncate" title={product.product_name}>
                          {product.product_name}
                        </span>
                      </div>
                    </td>
                    <td className="text-slate-400 font-mono text-sm">
                      {product.product_code || '-'}
                    </td>
                    <td className="text-right">{formatNumber(product.total_quantity)}</td>
                    <td className="text-right font-medium text-cyan-400">
                      {formatCurrency(product.total_revenue)}
                    </td>
                    <td className="text-right">{formatCurrency(product.avg_unit_price)}</td>
                    <td className="text-slate-400 text-sm">{formatDate(product.first_seen)}</td>
                    <td className="text-slate-400 text-sm">{formatDate(product.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination info */}
          <div className="px-4 py-3 border-t border-slate-700/50 text-sm text-slate-400">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </div>
      )}
    </div>
  );
}

