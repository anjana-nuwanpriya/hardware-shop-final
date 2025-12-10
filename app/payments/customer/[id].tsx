'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CustomerPaymentDetail {
  id: string;
  receipt_number: string;
  payment_date: string;
  customer_name?: string;
  payment_method: string;
  total_payment_amount: number;
  reference_number?: string;
  allocations?: Array<{
    id: string;
    invoice_number: string;
    invoice_amount: number;
    allocation_amount: number;
  }>;
}

export default function CustomerPaymentDetailPage() {
  const params = useParams();
  const [payment, setPayment] = useState<CustomerPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await fetch(`/api/customer-payments/${params.id}`);
        const data = await res.json();
        setPayment(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [params.id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!payment) return <div className="p-8">Payment not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{payment.receipt_number}</h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Customer</p>
          <p className="text-lg font-semibold">{payment.customer_name}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Payment Date</p>
          <p className="text-lg font-semibold">
            {new Date(payment.payment_date).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Payment Method</p>
          <p className="text-lg font-semibold">
            {payment.payment_method.replace('_', ' ')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-lg font-semibold">
            Rs. {payment.total_payment_amount.toLocaleString()}
          </p>
        </div>
      </div>

      {payment.reference_number && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-600">Reference Number</p>
          <p className="font-mono">{payment.reference_number}</p>
        </div>
      )}

      {payment.allocations && payment.allocations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Allocations</h2>
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Invoice</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Invoice Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Allocated Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payment.allocations.map((alloc) => (
                <tr key={alloc.id}>
                  <td className="px-6 py-3">{alloc.invoice_number}</td>
                  <td className="px-6 py-3">Rs. {alloc.invoice_amount.toLocaleString()}</td>
                  <td className="px-6 py-3 font-semibold">
                    Rs. {alloc.allocation_amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
