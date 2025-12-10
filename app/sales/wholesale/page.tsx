'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Sale {
  id: string;
  invoice_number: string;
  invoice_date: string;
  sale_date: string;
  customer_id: string | null;
  store_id: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  customers: { name: string; type: string } | null;
  stores: { code: string; name: string };
}

interface Store {
  id: string;
  code: string;
  name: string;
}

export default function SalesWholesalePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [stores, setStores] = useState<Store[]>([]);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [storeId, setStoreId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      setSuccess(`Sale created: ${params.get('success')}`);
      setTimeout(() => setSuccess(''), 3000);
    }

    fetchStores();
    fetchSales();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [paymentStatus, storeId, dateFrom, dateTo]);

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
      if (paymentStatus) params.append('payment_status', paymentStatus);
      if (storeId) params.append('store_id', storeId);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const url = `/api/sales-wholesale${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.data) {
        setSales(data.data);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      unpaid: { bg: 'bg-red-100', text: 'text-red-800' },
      partially_paid: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      paid: { bg: 'bg-green-100', text: 'text-green-800' },
    };
    const badge = badges[status] || badges.unpaid;
    return <span className={`px-2 py-1 rounded text-sm font-medium ${badge.bg} ${badge.text}`}>{status}</span>;
  };

  const stats = {
    total: sales.reduce((sum, s) => sum + s.total_amount, 0),
    count: sales.length,
    unpaid: sales.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + s.total_amount, 0),
    paid: sales.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + s.total_amount, 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Wholesale Sales</h1>
        <p className="text-gray-600 text-sm mt-1">Manage wholesale customer invoices</p>
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-blue-600">
            Rs. {stats.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Invoice Count</p>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-gray-600">Unpaid Amount</p>
          <p className="text-2xl font-bold text-red-600">
            Rs. {stats.unpaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Paid Amount</p>
          <p className="text-2xl font-bold text-green-600">
            Rs. {stats.paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Link
            href="/sales/wholesale/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium text-center"
          >
            + New Sale
          </Link>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading sales...</div>
        ) : sales.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No sales found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Store</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Method</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      <Link href={`/sales/wholesale/${sale.id}`} className="hover:underline">
                        {sale.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {sale.customers ? (
                        <>
                          <div className="font-medium">{sale.customers.name}</div>
                          <div className="text-xs text-gray-500">{sale.customers.type}</div>
                        </>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{sale.stores.name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Rs. {sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{sale.payment_method}</td>
                    <td className="px-4 py-3 text-sm">{getPaymentStatusBadge(sale.payment_status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/sales/wholesale/${sale.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
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