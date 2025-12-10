'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  customer_id?: string;
  customer_name?: string;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  total_amount: number;
  valid_until: string;
  created_at: string;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/quotations');
      const data = await res.json();
      setQuotations(data.data || []);
    } catch (err) {
      setError('Failed to load quotations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
      converted: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading quotations...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quotations</h1>
        <Link
          href="/sales/quotations/new"
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        >
          + New Quotation
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Quotation #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Valid Until</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotations.map((quot) => (
              <tr key={quot.id}>
                <td className="px-6 py-4 font-medium text-purple-600">{quot.quotation_number}</td>
                <td className="px-6 py-4">{quot.customer_name}</td>
                <td className="px-6 py-4">{new Date(quot.quotation_date).toLocaleDateString()}</td>
                <td className="px-6 py-4">{new Date(quot.valid_until).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-semibold">Rs. {quot.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-xs ${getStatusColor(quot.status)}`}>
                    {quot.status}
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
