'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface OpeningStockItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  category_name: string;
  description?: string;
  batch_no?: string;
  batch_expiry?: string;
  quantity: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  unit_of_measure: string;
  discount_percent: number;
  discount_value: number;
  net_value: number;
  cost_valuation: number;
  tax_method: string;
  tax_rate: number;
}

interface ItemSummary {
  total_items: number;
  total_quantity: number;
  total_cost_valuation: number;
}

interface OpeningStockEntry {
  id: string;
  ref_number: string;
  entry_date: string;
  store_id: string;
  store_name: string;
  store_code: string;
  store_address?: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_contact?: string;
  supplier_phone?: string;
  description?: string;
  total_value: number;
  total_discount: number;
  net_total: number;
  employee_id?: string;
  employee_name: string;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: {
    entry: OpeningStockEntry;
    items: OpeningStockItem[];
    itemSummary: ItemSummary;
  };
  error?: string;
}

export default function OpeningStockDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [entry, setEntry] = useState<OpeningStockEntry | null>(null);
  const [items, setItems] = useState<OpeningStockItem[]>([]);
  const [itemSummary, setItemSummary] = useState<ItemSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (id) {
      fetchEntry();
    }
  }, [id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/opening-stock/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load entry`);
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setEntry(data.data.entry);
        setItems(data.data.items || []);
        setItemSummary(data.data.itemSummary || null);
      } else {
        setError(data.error || 'Failed to load opening stock entry');
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading the entry');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!entry) return;

    const confirmed = window.confirm(
      'Are you sure you want to finalize this opening stock entry? Once finalized, it cannot be edited.'
    );
    if (!confirmed) return;

    try {
      setFinalizing(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`/api/opening-stock/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: null }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to finalize`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Opening stock entry finalized successfully!');
        setEntry((prev) =>
          prev ? { ...prev, is_active: false, status: 'finalized' } : null
        );
        setTimeout(() => {
          router.push('/stock/opening-stock');
        }, 2000);
      } else {
        setError(data.error || 'Failed to finalize entry');
      }
    } catch (error) {
      console.error('Error finalizing entry:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while finalizing the entry');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this opening stock entry? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch(`/api/opening-stock/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to delete`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Opening stock entry deleted successfully!');
        setTimeout(() => {
          router.push('/stock/opening-stock');
        }, 1500);
      } else {
        setError(data.error || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while deleting the entry');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading opening stock entry...</p>
        </div>
      </div>
    );
  }

  if (!entry || error) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h1 className="text-xl font-bold text-red-900">Error Loading Entry</h1>
            <p className="text-red-700 mt-2">
              {error || 'The opening stock entry could not be found.'}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Go Back
              </button>
              <button
                onClick={() => router.push('/stock/opening-stock')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Go to List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalized':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{entry.ref_number}</h1>
              <p className="mt-2 text-gray-600">
                Created on {new Date(entry.entry_date).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${getStatusBadge(entry.status)}`}>
                {entry.status === 'active' ? 'Active' : 'Finalized'}
              </span>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {successMessage}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Store Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Store Code</label>
                <p className="font-semibold text-gray-900">{entry.store_code}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Store Name</label>
                <p className="font-semibold text-gray-900">{entry.store_name}</p>
              </div>
              {entry.store_address && (
                <div>
                  <label className="text-sm text-gray-600">Address</label>
                  <p className="text-gray-900">{entry.store_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Supplier Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Supplier Name</label>
                <p className="font-semibold text-gray-900">{entry.supplier_name}</p>
              </div>
              {entry.supplier_contact && (
                <div>
                  <label className="text-sm text-gray-600">Contact Person</label>
                  <p className="text-gray-900">{entry.supplier_contact}</p>
                </div>
              )}
              {entry.supplier_phone && (
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <p className="text-gray-900">{entry.supplier_phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-gray-900">₨ {entry.total_value.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Discount</div>
            <div className="text-2xl font-bold text-red-600">-₨ {entry.total_discount.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Net Total</div>
            <div className="text-2xl font-bold text-green-600">₨ {entry.net_total.toFixed(2)}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Items ({items.length})</h2>
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-center text-gray-600">No items in this opening stock entry</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Item Code</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Item Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Batch No.</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Expiry Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Quantity</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Cost Price</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Discount</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Net Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.item_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.item_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.category_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.batch_no || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.batch_expiry ? new Date(item.batch_expiry).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">₨ {item.cost_price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          {item.discount_value > 0 ? `${item.discount_percent.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          ₨ {item.net_value.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Items Summary */}
              {itemSummary && (
                <div className="bg-gray-50 px-6 py-4 border-t">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Items</p>
                      <p className="text-lg font-bold text-gray-900">{itemSummary.total_items}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Quantity</p>
                      <p className="text-lg font-bold text-gray-900">{itemSummary.total_quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cost Valuation</p>
                      <p className="text-lg font-bold text-green-600">₨ {itemSummary.total_cost_valuation.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Description */}
        {entry.description && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{entry.description}</p>
          </div>
        )}

        {/* Meta Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-600">Created By</label>
              <p className="text-gray-900">{entry.employee_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Created On</label>
              <p className="text-gray-900">{new Date(entry.created_at).toLocaleString()}</p>
            </div>
            {entry.updated_at !== entry.created_at && (
              <div>
                <label className="text-sm text-gray-600">Last Updated</label>
                <p className="text-gray-900">{new Date(entry.updated_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap">
          {entry.is_active && (
            <>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {finalizing ? 'Finalizing...' : 'Finalize Entry'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </>
          )}
          {!entry.is_active && (
            <div className="flex-1 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              This entry is finalized and cannot be modified.
            </div>
          )}
          <button
            onClick={() => router.push('/stock/opening-stock')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Back to List
          </button>
        </div>
      </div>
    </div>
  );
}