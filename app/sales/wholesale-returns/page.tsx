'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Return {
  id: string;
  return_number: string;
  return_date: string;
  customer_id: string;
  store_id: string;
  return_reason: string;
  refund_method: string;
  total_refund_amount: number;
  customers: { name: string };
  stores: { code: string; name: string };
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function WholesaleReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [storeId, setStoreId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      setSuccess(`Return created: ${params.get('success')}`);
      setTimeout(() => setSuccess(''), 3000);
    }

    fetchStores();
    fetchCustomers();
    fetchReturns();
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [storeId, customerId, dateFrom, dateTo]);

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

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?type=wholesale');
      const data = await res.json();
      if (data.data) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (storeId) params.append('store_id', storeId);
      if (customerId) params.append('customer_id', customerId);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const url = `/api/sales-wholesale-returns${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.data) {
        setReturns(data.data);
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: returns.reduce((sum, r) => sum + r.total_refund_amount, 0),
    count: returns.length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Wholesale Sales Returns</h1>
        <p className="text-gray-600 text-sm mt-1">Manage wholesale customer returns and refunds</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✓ {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600">Total Refunds</p>
          <p className="text-2xl font-bold text-purple-600">
            Rs. {stats.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Return Count</p>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
        </div>
      </div>

      {/* Filters & Action */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Stores</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Customers</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <Link
            href="/sales/wholesale-returns/new"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium text-center"
          >
            + New Return
          </Link>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading returns...</div>
        ) : returns.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No returns found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Return #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Store</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Refund Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(ret => (
                  <tr key={ret.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-purple-600">
                      <Link href={`/sales/wholesale-returns/${ret.id}`} className="hover:underline">
                        {ret.return_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(ret.return_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ret.customers.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ret.stores.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ret.return_reason}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Rs. {ret.total_refund_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ret.refund_method}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/sales/wholesale-returns/${ret.id}`}
                        className="text-purple-600 hover:text-purple-800 font-medium"
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
    </div>
  );
}