'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface ReturnItem {
  id: string;
  item_id: string;
  batch_no: string | null;
  original_qty: number;
  return_qty: number;
  unit_price: number;
  discount_percent: number;
  discount_value: number;
  refund_value: number;
  items: {
    id: string;
    code: string;
    name: string;
  };
}

interface WholesaleReturn {
  id: string;
  return_number: string;
  return_date: string;
  customer_id: string;
  store_id: string;
  sales_wholesale_id: string | null;
  return_reason: string;
  refund_method: string;
  total_refund_amount: number;
  description: string | null;
  employee_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  stores: {
    id: string;
    code: string;
    name: string;
  };
  employees: {
    id: string;
    name: string;
  } | null;
  sales_wholesale_return_items: ReturnItem[];
}

const REFUND_METHODS = ['bank_transfer', 'credit_note', 'cash', 'card_refund'];

export default function WholesaleReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [returnData, setReturnData] = useState<WholesaleReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    refund_method: '',
    description: '',
  });

  useEffect(() => {
    fetchReturn();
  }, [id]);

  const fetchReturn = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales-wholesale-returns/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load return');
        return;
      }

      setReturnData(data.data);
      setFormData({
        refund_method: data.data.refund_method || 'bank_transfer',
        description: data.data.description || '',
      });
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load return');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setEditing(true);
      setError('');
      setSuccess('');

      const res = await fetch(`/api/sales-wholesale-returns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_method: formData.refund_method,
          description: formData.description,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update return');
      }

      setSuccess('Return updated successfully');
      fetchReturn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update return');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');

      const res = await fetch(`/api/sales-wholesale-returns/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete return');
      }

      setSuccess('Return deleted and stock reverted');
      setTimeout(() => {
        router.push('/sales/wholesale-returns');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete return');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full"></div>
        <p className="mt-2">Loading return details...</p>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Return not found</p>
        <Link href="/sales/wholesale-returns" className="text-purple-600 hover:text-purple-800 mt-4 inline-block">
          ← Back to Returns
        </Link>
      </div>
    );
  }

  const getReasonDisplay = (reason: string) => {
    return reason.replace(/_/g, ' ').split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/sales/wholesale-returns" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
          ← Back to Returns
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-3xl font-bold">{returnData.return_number}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {new Date(returnData.return_date).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600">
              Rs. {returnData.total_refund_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-gray-600 mt-1">Total Refund</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{returnData.customers.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{returnData.customers.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-purple-600">{returnData.customers.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Store</p>
                <p className="font-medium">{returnData.stores.name}</p>
              </div>
            </div>
          </div>

          {/* Return Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Return Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Return Reason</p>
                <p className="font-medium">{getReasonDisplay(returnData.return_reason)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Refund Method</p>
                <p className="font-medium capitalize">{returnData.refund_method.replace(/_/g, ' ')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Description</p>
                <p className="font-medium">{returnData.description || 'No description'}</p>
              </div>
            </div>

            {/* Edit Form */}
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-purple-600 hover:text-purple-800 font-medium text-sm"
              >
                ✎ Edit Details
              </button>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refund Method</label>
                  <select
                    value={formData.refund_method}
                    onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {REFUND_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editing}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Returned Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Item</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Discount</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {returnData.sales_wholesale_return_items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.items.name}</div>
                        <div className="text-gray-600">{item.items.code}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{item.return_qty}</td>
                      <td className="px-4 py-3 text-right">
                        Rs. {item.unit_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.discount_value > 0 ? (
                          <>
                            Rs. {item.discount_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-purple-600">
                        Rs. {item.refund_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
            <h3 className="font-semibold text-gray-700 mb-4">Refund Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items Count</span>
                <span className="font-medium">{returnData.sales_wholesale_return_items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Qty</span>
                <span className="font-medium">
                  {returnData.sales_wholesale_return_items.reduce((sum, item) => sum + item.return_qty, 0)}
                </span>
              </div>
              <div className="border-t border-purple-200 pt-3 flex justify-between">
                <span className="font-semibold">Total Refund</span>
                <span className="font-bold text-purple-600">
                  Rs. {returnData.total_refund_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Return Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Return Number</p>
                <p className="font-mono font-semibold text-purple-600">{returnData.return_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-medium">
                  {new Date(returnData.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Last Updated</p>
                <p className="font-medium">
                  {new Date(returnData.updated_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              {returnData.employees && (
                <div>
                  <p className="text-gray-600">Created By</p>
                  <p className="font-medium">{returnData.employees.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full border border-purple-600 text-purple-600 px-4 py-2 rounded hover:bg-purple-50 font-medium text-sm"
              >
                🖨 Print Return
              </button>
              {showDeleteConfirm ? (
                <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                  <p className="text-sm text-red-700 font-medium">Delete this return? Stock will be reverted.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 border border-red-300 text-red-700 px-3 py-2 rounded hover:bg-red-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium text-sm"
                >
                  🗑 Delete Return
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}