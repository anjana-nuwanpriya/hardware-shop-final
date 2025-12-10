'use client';

import { useState, useEffect } from 'react';
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

export default function SalesRetailPage() {
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

  // Check for success message
  useEffect(() => {
    const successMsg = searchParams.get('success');
    if (successMsg) {
      setSuccess(`Sale ${successMsg} created successfully!`);
      setTimeout(() => setSuccess(''), 5000);
    }
  }, [searchParams]);

  // Fetch stores for filter
  useEffect(() => {
    fetchStores();
  }, []);

  // Fetch sales when filters change
  useEffect(() => {
    fetchSales();
  }, [filters]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      if (data.data) {
        setStores(data.data);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBg = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-red-50',
      partially_paid: 'bg-yellow-50',
      paid: 'bg-green-50',
    };
    return colors[status] || 'bg-gray-50';
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Retail Sales</h1>
          <p className="text-gray-600 text-sm mt-1">
            Point of Sale (POS) - Walk-in and registered customer sales
          </p>
        </div>
        <Link
          href="/sales/retail/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span>+</span> New Sale
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            ✕
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Real-Time Stock Deduction</h3>
        <p className="text-sm text-blue-800">
          Stock is deducted immediately when sales are created. Check the Stock Management
          section to verify quantities are updated in real-time.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store
            </label>
            <select
              value={filters.store_id}
              onChange={(e) => handleFilterChange('store_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={filters.payment_status}
              onChange={(e) => handleFilterChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={clearFilters}
            className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading sales...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No sales found</p>
            <p className="text-sm">
              <Link href="/sales/retail/new" className="text-blue-600 hover:text-blue-800">
                Create your first sale
              </Link>
            </p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((sale) => (
                <tr key={sale.id} className={`hover:bg-gray-50 ${getStatusBg(sale.payment_status)}`}>
                  <td className="px-6 py-4 font-semibold text-blue-600">
                    <Link href={`/sales/retail/${sale.id}`} className="hover:text-blue-800">
                      {sale.invoice_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(sale.invoice_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {sale.customers?.name ? (
                      <div>
                        <div className="font-medium">{sale.customers.name}</div>
                        <div className="text-xs text-gray-500">{sale.customers.type}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">Walk-in</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium">{sale.stores?.name}</div>
                    <div className="text-xs text-gray-500">{sale.stores?.code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="capitalize">
                      {sale.payment_method === 'bank'
                        ? 'Bank Transfer'
                        : sale.payment_method}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                    Rs. {sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        sale.payment_status
                      )}`}
                    >
                      {sale.payment_status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/sales/retail/${sale.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {sales.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total Sales</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs. {sales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-gray-900">{sales.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Unpaid</div>
            <div className="text-2xl font-bold text-red-600">
              {sales.filter(s => s.payment_status === 'unpaid').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Paid</div>
            <div className="text-2xl font-bold text-green-600">
              {sales.filter(s => s.payment_status === 'paid').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}