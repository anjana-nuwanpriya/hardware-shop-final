'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PurchaseReturn {
  id: string;
  return_number: string;
  return_date: string;
  supplier_id: string;
  supplier_name?: string;
  store_id: string;
  store_name?: string;
  grn_reference_id?: string;
  return_reason: string;
  total_amount: number;
  created_at: string;
}

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');

  const returnReasons = [
    'defective',
    'wrong_item',
    'excess',
    'damaged_in_transit',
    'other',
  ];

  useEffect(() => {
    fetchReturns();
  }, [reasonFilter]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const url = reasonFilter === 'all'
        ? '/api/purchase-returns'
        : `/api/purchase-returns?reason=${reasonFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setReturns(data.data || []);
    } catch (err) {
      setError('Failed to load purchase returns');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      defective: 'bg-red-100 text-red-800',
      wrong_item: 'bg-orange-100 text-orange-800',
      excess: 'bg-blue-100 text-blue-800',
      damaged_in_transit: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[reason] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading purchase returns...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
        <h3 className="font-semibold text-amber-900 mb-2">💡 How Purchase Returns Work</h3>
        <p className="text-sm text-amber-800">
          When you create a return:
          1. Reduces supplier payable (less money owed)
          2. Removes goods from inventory (reduces stock)
          3. Creates inventory transaction (audit trail)
          4. Reference to original GRN (optional)
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase Returns</h1>
        <Link
          href="/purchase/returns/new"
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          + Create Return
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
          Filter by Reason:
        </label>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="all">All Reasons</option>
          {returnReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Return Number
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Store
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Return Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Return Amount
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No purchase returns found
                </td>
              </tr>
            ) : (
              returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-red-600">
                    <Link href={`/purchase/returns/${ret.id}`}>
                      {ret.return_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {ret.supplier_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {ret.store_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(ret.return_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getReasonColor(ret.return_reason)}`}>
                      {ret.return_reason.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Rs. {ret.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/purchase/returns/${ret.id}`}
                      className="text-red-600 hover:text-red-800"
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

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Return Reasons</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Defective:</strong> Product is faulty or broken</p>
          <p><strong>Wrong Item:</strong> Supplier sent incorrect item</p>
          <p><strong>Excess:</strong> Over-delivered quantity</p>
          <p><strong>Damaged in Transit:</strong> Arrived damaged</p>
          <p><strong>Other:</strong> Specify in description</p>
        </div>
      </div>
    </div>
  );
}