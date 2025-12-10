'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesWholesale {
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

export default function SalesWholesalePage() {
  const [sales, setSales] = useState<SalesWholesale[]>([]);
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
        ? '/api/sales-wholesale'
        : `/api/sales-wholesale?status=${statusFilter}`;
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales - Wholesale</h1>
        <Link
          href="/sales/wholesale/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          + New Wholesale Sale
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded"
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Invoice #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-6 py-4 font-medium text-green-600">{sale.invoice_number}</td>
                <td className="px-6 py-4">{sale.customer_name}</td>
                <td className="px-6 py-4">{new Date(sale.invoice_date).toLocaleDateString()}</td>
                <td className="px-6 py-4">Rs. {sale.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-xs ${getStatusColor(sale.payment_status)}`}>
                    {sale.payment_status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
