'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesRetail {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id?: string;
  customer_name?: string;
  store_id: string;
  store_name?: string;
  payment_method: string;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  total_amount: number;
  created_at: string;
}

export default function SalesRetailPage() {
  const [sales, setSales] = useState<SalesRetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchSales();
  }, [statusFilter]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? '/api/sales-retail'
        : `/api/sales-retail?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setSales(data.data || []);
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

  if (loading) {
    return <div className="p-8 text-center">Loading sales...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">⭐ REAL-TIME STOCK DEDUCTION</h3>
        <p className="text-sm text-blue-800">
          When you create a sales invoice, stock is deducted IMMEDIATELY.
          Check /stock/current-stock to verify quantities updated in real-time.
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales - Retail (POS)</h1>
        <Link
          href="/sales/retail/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + New Sale
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Payment Status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Store</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No sales found
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-blue-600">
                    <Link href={`/sales/retail/${sale.id}`}>
                      {sale.invoice_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {sale.customer_name || 'Walk-in'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {sale.store_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(sale.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Rs. {sale.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.payment_status)}`}>
                      {sale.payment_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/sales/retail/${sale.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
