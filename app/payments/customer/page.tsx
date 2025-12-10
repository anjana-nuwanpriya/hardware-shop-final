'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CustomerPayment {
  id: string;
  receipt_number: string;
  payment_date: string;
  customer_id?: string;
  customer_name?: string;
  payment_method: string;
  total_payment_amount: number;
  reference_number?: string;
  created_at: string;
}

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer-payments');
      const data = await res.json();
      setPayments(data.data || []);
    } catch (err) {
      setError('Failed to load payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      bank_transfer: 'bg-blue-100 text-blue-800',
      cheque: 'bg-yellow-100 text-yellow-800',
      card: 'bg-purple-100 text-purple-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading payments...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">⭐ PAYMENT ALLOCATION</h3>
        <p className="text-sm text-blue-800">
          Each payment can be allocated to multiple invoices.
          Payment status updates automatically based on allocation amounts.
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customer Payments</h1>
        <Link
          href="/payments/customer/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Receipt
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Receipt #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Payment Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Method</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-blue-600">
                    <Link href={`/payments/customer/${payment.id}`}>
                      {payment.receipt_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{payment.customer_name}</td>
                  <td className="px-6 py-4">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${paymentMethodColor(payment.payment_method)}`}>
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    Rs. {payment.total_payment_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.reference_number}
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
