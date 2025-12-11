'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  code: string;
  name: string;
  unit_of_measure: string;
}

interface SaleItem {
  id: string;
  item_id: string;
  items?: Item;
  batch_no?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_value: number;
  tax_value: number;
  net_value: number;
}

interface Customer {
  id: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
}

interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
}

interface Employee {
  id: string;
  name: string;
  email?: string;
}

interface Sale {
  id: string;
  invoice_number: string;
  invoice_date: string;
  sale_date: string;
  customer_id?: string;
  customers?: Customer;
  store_id: string;
  stores?: Store;
  employee_id?: string;
  employees?: Employee;
  payment_method: string;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sales_retail_items?: SaleItem[];
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [saleId, setSaleId] = useState<string | null>(null);

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setSaleId(id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (saleId) {
      fetchSale();
    }
  }, [saleId]);

  useEffect(() => {
    if (sale) {
      setPaymentStatus(sale.payment_status);
    }
  }, [sale]);

  const fetchSale = async () => {
    if (!saleId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/sales-retail/${saleId}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load sale');
        return;
      }

      setSale(data.data);
    } catch (err) {
      setError('Failed to load sale');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!sale || !saleId || paymentStatus === sale.payment_status) return;

    try {
      setUpdating(true);
      setError('');

      const res = await fetch(`/api/sales-retail/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: paymentStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update');
      }

      setSuccess('Payment status updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchSale();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this sale? Stock will be reverted.')) {
      return;
    }

    if (!saleId) return;

    try {
      setUpdating(true);
      setError('');

      const res = await fetch(`/api/sales-retail/${saleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      setSuccess('Sale deleted successfully');
      setTimeout(() => router.push('/sales/retail'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin">Loading...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Sale not found'}
        </div>
        <Link href="/sales/retail" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Sales
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/sales/retail" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Back to Retail Sales
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-3xl font-bold">{sale.invoice_number}</h1>
            <p className="text-gray-600 text-sm mt-1">
              Created on{' '}
              {new Date(sale.invoice_date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at{' '}
              {new Date(sale.invoice_date).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(sale.payment_status)}`}>
            {sale.payment_status.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Sale Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Sale Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Store</p>
                <p className="font-semibold text-gray-900">{sale.stores?.name}</p>
                <p className="text-xs text-gray-500">{sale.stores?.code}</p>
                {sale.stores?.address && (
                  <p className="text-xs text-gray-500 mt-1">{sale.stores.address}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {sale.payment_method === 'bank' ? 'Bank Transfer' : sale.payment_method}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                {sale.customers ? (
                  <>
                    <p className="font-semibold text-gray-900">{sale.customers.name}</p>
                    <p className="text-xs text-gray-500">{sale.customers.type}</p>
                  </>
                ) : (
                  <p className="font-semibold text-gray-900 italic">Walk-in Customer</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Cashier</p>
                {sale.employees ? (
                  <>
                    <p className="font-semibold text-gray-900">{sale.employees.name}</p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">Not assigned</p>
                )}
              </div>
            </div>
            {sale.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <p className="text-gray-900">{sale.description}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Sale Items</h2>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Code
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sale.sales_retail_items && sale.sales_retail_items.length > 0 ? (
                  sale.sales_retail_items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{item.items?.name}</div>
                        {item.batch_no && (
                          <div className="text-xs text-gray-500">Batch: {item.batch_no}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.items?.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-semibold text-gray-900">
                        {item.quantity} {item.items?.unit_of_measure || 'pc'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        Rs. {item.unit_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        Rs. {item.discount_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                        Rs.{' '}
                        {item.net_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  Rs. {sale.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-medium text-orange-600">
                  -Rs. {sale.discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              {sale.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">
                    Rs. {sale.tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">
                  Rs. {sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Status</h2>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              disabled={updating}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
            <button
              onClick={handleUpdatePaymentStatus}
              disabled={updating || paymentStatus === sale.payment_status}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <button
              onClick={handleDelete}
              disabled={updating || !sale.is_active}
              className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Deleting...' : 'Delete Sale'}
            </button>
            {!sale.is_active && (
              <p className="text-xs text-gray-500 mt-2">This sale has been deleted</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}