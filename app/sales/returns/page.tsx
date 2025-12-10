'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesReturn {
  id: string;
  return_number: string;
  return_date: string;
  customer_id?: string;
  customer_name?: string;
  store_name?: string;
  return_reason: string;
  total_refund_amount: number;
  created_at: string;
}

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sales-returns');
      const data = await res.json();
      setReturns(data.data || []);
    } catch (err) {
      setError('Failed to load returns');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading returns...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Returns</h1>
        <Link
          href="/sales/returns/new"
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition"
        >
          + New Return
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Return #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Reason</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Refund Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {returns.map((ret) => (
              <tr key={ret.id}>
                <td className="px-6 py-4 font-medium text-orange-600">{ret.return_number}</td>
                <td className="px-6 py-4">{ret.customer_name}</td>
                <td className="px-6 py-4">{new Date(ret.return_date).toLocaleDateString()}</td>
                <td className="px-6 py-4">{ret.return_reason}</td>
                <td className="px-6 py-4 font-semibold">Rs. {ret.total_refund_amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
