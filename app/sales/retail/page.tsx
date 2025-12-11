'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  type: string;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface SalesRetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  sale_date: string;
  customer_id?: string;
  customers?: Customer;
  store_id: string;
  stores?: Store;
  employee_id?: string;
  employees?: Employee;
  payment_method: string;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  is_active: boolean;
}

function SalesRetailContent() {
  const searchParams = useSearchParams();
  const [sales, setSales] = useState<SalesRetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState({
    payment_status: '',
    store_id: '',
    date_from: '',
    date_to: '',
  });

  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    const successMsg = searchParams.get('success');
    if (successMsg) {
      setSuccess(`Sale ${successMsg} created successfully!`);
      setTimeout(() => setSuccess(''), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [filters]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      if (data.success && data.data) {
        setStores(data.data);
      } else if (data.stores) {
        setStores(data.stores);
      }
    } catch (err) {
      setStores([]);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.payment_status) params.append('payment_status', filters.payment_status);
      if (filters.store_id) params.append('store_id', filters.store_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await fetch(`/api/sales-retail?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSales(data.data || []);
      } else {
        setError(data.error || 'Failed to load sales');
      }
    } catch (err) {
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-rose-100 text-rose-800',
      partially_paid: 'bg-amber-100 text-amber-800',
      paid: 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || 'bg-slate-100';
  };

  const getStatusBg = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
      partially_paid: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      paid: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    };
    return colors[status] || 'bg-slate-50';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      unpaid: '⏱',
      partially_paid: '⚠',
      paid: '✓',
    };
    return icons[status] || '•';
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      payment_status: '',
      store_id: '',
      date_from: '',
      date_to: '',
    });
  };

  const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const unpaidCount = sales.filter(s => s.payment_status === 'unpaid').length;
  const paidCount = sales.filter(s => s.payment_status === 'paid').length;

  return (
    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">🛍️ Retail Sales</h1>
          <p className="text-sm text-gray-600">Point of Sale (POS) - Walk-in & customer transactions</p>
        </div>
        <Link
          href="/sales/retail/new"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:shadow-lg transition flex items-center gap-2 shadow"
        >
          <span className="text-lg">+</span> New Sale
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg flex justify-between items-center text-xs shadow-sm">
          <span className="font-medium">✓ {success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-900 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg text-xs shadow-sm">
        <h3 className="font-bold text-blue-900 mb-1">📊 Real-Time Stock Deduction</h3>
        <p className="text-blue-800">Stock is deducted immediately when sales are created. Check Stock Management to verify quantities.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-3">Filters</label>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store</label>
            <select
              value={filters.store_id}
              onChange={(e) => handleFilterChange('store_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">All Stores</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => handleFilterChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">All Status</option>
              <option value="unpaid">⏱ Unpaid</option>
              <option value="partially_paid">⚠ Partially Paid</option>
              <option value="paid">✓ Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <button
            onClick={clearFilters}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 text-xs font-semibold transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-700 rounded-lg text-xs flex items-center gap-2 shadow-sm">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-gray-600">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              Loading sales...
            </div>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 text-sm mb-3">No sales found</p>
            <Link href="/sales/retail/new" className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
              → Create your first sale
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Invoice</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Store</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700">Payment</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className={`border-l-4 transition hover:shadow-sm ${
                    sale.payment_status === 'unpaid' ? 'border-l-rose-500' :
                    sale.payment_status === 'partially_paid' ? 'border-l-amber-500' : 'border-l-emerald-500'
                  } ${getStatusBg(sale.payment_status)}`}>
                    <td className="px-4 py-3 font-bold text-blue-600">
                      <Link href={`/sales/retail/${sale.id}`} className="hover:text-blue-800 hover:underline">
                        {sale.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {new Date(sale.invoice_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      {sale.customers?.name ? (
                        <div>
                          <div className="font-semibold text-gray-900">{sale.customers.name}</div>
                          <div className="text-xs text-gray-500">{sale.customers.type}</div>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic text-xs">Walk-in</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{sale.stores?.name}</div>
                      <div className="text-xs text-gray-500">{sale.stores?.code}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 capitalize text-xs">
                      {sale.payment_method === 'bank' ? '🏦 Bank' : `💳 ${sale.payment_method}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-right text-gray-900">
                      Rs. {sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${getStatusColor(sale.payment_status)}`}>
                        {getStatusIcon(sale.payment_status)} {sale.payment_status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/sales/retail/${sale.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {sales.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">💰 Total Sales</p>
            <p className="text-xl font-bold">Rs. {(totalSales / 100000).toFixed(1)}L</p>
            <p className="text-xs mt-2 opacity-75">{sales.length} invoices</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">⏱ Unpaid</p>
            <p className="text-2xl font-bold">{unpaidCount}</p>
            <p className="text-xs mt-2 opacity-75">pending</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">⚠️ Partial</p>
            <p className="text-2xl font-bold">{sales.filter(s => s.payment_status === 'partially_paid').length}</p>
            <p className="text-xs mt-2 opacity-75">in progress</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">✓ Paid</p>
            <p className="text-2xl font-bold">{paidCount}</p>
            <p className="text-xs mt-2 opacity-75">completed</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesRetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-xs">Loading...</div>}>
      <SalesRetailContent />
    </Suspense>
  );
}