'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Sale {
  id: string;
  invoice_number: string;
  invoice_date: string;
  sale_date: string;
  customer_id: string | null;
  store_id: string;
  employee_id: string | null;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  description: string | null;
  is_active: boolean;
  customers: { id: string; name: string; type: string; phone: string; email: string } | null;
  stores: { id: string; code: string; name: string };
  employees: { id: string; name: string } | null;
  sales_wholesale_items: Array<{
    id: string;
    item_id: string;
    batch_no: string | null;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    discount_value: number;
    tax_value: number;
    net_value: number;
    items: { id: string; code: string; name: string };
  }>;
}

export default function SaleWholesaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    fetchSale();
  }, [id]);

  useEffect(() => {
    if (sale) {
      setPaymentStatus(sale.payment_status);
    }
  }, [sale]);

  const fetchSale = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales-wholesale/${id}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch sale: ${res.status}`);
      }
      
      const data = await res.json();
      setSale(data.data);
    } catch (err) {
      console.error('Error fetching sale:', err);
      setError('Failed to load sale details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!sale || paymentStatus === sale.payment_status) {
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`/api/sales-wholesale/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: paymentStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update payment status');
      }

      const data = await res.json();
      setSale(data.data);
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError('Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this sale? Stock will be reverted.')) {
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`/api/sales-wholesale/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete sale');
      }

      router.push('/sales/wholesale?deleted=true');
    } catch (err) {
      console.error('Error deleting sale:', err);
      setError('Failed to delete sale');
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center text-gray-500">Loading sale details...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center text-red-600">{error || 'Sale not found'}</div>
      </div>
    );
  }

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      unpaid: { bg: 'bg-red-100', text: 'text-red-800' },
      partially_paid: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      paid: { bg: 'bg-green-100', text: 'text-green-800' },
    };
    const badge = badges[status] || badges.unpaid;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>{status}</span>;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/sales/wholesale"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Wholesale Sales
        </Link>
        <div className="flex justify-between items-center mt-2">
          <div>
            <h1 className="text-3xl font-bold">{sale.invoice_number}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {new Date(sale.sale_date).toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="text-right">
            {getPaymentStatusBadge(sale.payment_status)}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="col-span-2 space-y-6">
          {/* Sale Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Sale Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium text-gray-900">
                  {sale.customers ? (
                    <>
                      <div>{sale.customers.name}</div>
                      <div className="text-xs text-gray-500">{sale.customers.type}</div>
                    </>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Store</p>
                <p className="font-medium text-gray-900">{sale.stores.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium text-gray-900">{sale.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-medium text-gray-900">{sale.employees?.name || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Description</p>
                <p className="font-medium text-gray-900">{sale.description || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Sale Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Item</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                    <th className="px-4 py-2 text-right font-semibold">Discount</th>
                    <th className="px-4 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.sales_wholesale_items.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium">{item.items.name}</div>
                        <div className="text-xs text-gray-500">{item.items.code}</div>
                      </td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">Rs. {item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        {item.discount_percent > 0 && (
                          <span>
                            {item.discount_percent}% (Rs. {item.discount_value.toFixed(2)})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        Rs. {item.net_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-4">
          {/* Payment Status Update */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Update Payment Status</h3>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-3 text-sm"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
            <button
              onClick={handleUpdatePaymentStatus}
              disabled={updating || paymentStatus === sale.payment_status}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Update Status
            </button>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
            <h3 className="font-semibold mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-medium">
                  Rs. {sale.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Discount</span>
                  <span className="font-medium text-orange-600">
                    -Rs. {sale.discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax</span>
                  <span className="font-medium">
                    Rs. {sale.tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
                  Rs. {sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleDelete}
            disabled={updating}
            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Delete Sale
          </button>
        </div>
      </div>
    </div>
  );
}