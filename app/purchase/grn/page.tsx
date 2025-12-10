'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GRN {
  id: string;
  grn_number: string;
  grn_date: string;
  supplier_id: string;
  supplier_name?: string;
  store_id: string;
  store_name?: string;
  po_reference_id?: string;
  invoice_number?: string;
  total_amount: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  created_at: string;
}

export default function GRNPage() {
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    fetchGRNs();
  }, [paymentFilter]);

  const fetchGRNs = async () => {
    try {
      setLoading(true);
      const url = paymentFilter === 'all'
        ? '/api/purchase-grns'
        : `/api/purchase-grns?payment_status=${paymentFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setGRNs(data.data || []);
    } catch (err) {
      setError('Failed to load GRNs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading GRNs...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">⭐ Important: GRN Operations</h3>
        <p className="text-sm text-blue-800">
          When you create a GRN, the system:
          1. Creates a supplier payable (amount owed to supplier)
          2. Updates stock levels (adds goods to inventory)
          3. Creates inventory transactions (audit trail)
          4. Sets payment status to 'unpaid'
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Goods Received Notes (GRN)</h1>
        <Link
          href="/purchase/grn/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          + Create GRN
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Payment Status:
        </label>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                GRN Number
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Store
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                GRN Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grns.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No GRNs found
                </td>
              </tr>
            ) : (
              grns.map((grn) => (
                <tr key={grn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-green-600">
                    <Link href={`/purchase/grn/${grn.id}`}>
                      {grn.grn_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {grn.supplier_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {grn.store_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(grn.grn_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {grn.invoice_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Rs. {grn.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(grn.payment_status)}`}>
                      {grn.payment_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/purchase/grn/${grn.id}`}
                      className="text-green-600 hover:text-green-800"
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

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 How GRN Works</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Create GRN when supplier delivers goods</li>
          <li>• System automatically adds goods to inventory</li>
          <li>• Creates supplier payable (amount owed)</li>
          <li>• Payment status starts as 'unpaid'</li>
          <li>• When you pay supplier, status updates automatically</li>
          <li>• Use Current Stock view to verify quantities</li>
        </ul>
      </div>
    </div>
  );
}