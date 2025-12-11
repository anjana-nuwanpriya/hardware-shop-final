'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface DispatchItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  batch_no: string | null;
  batch_expiry: string | null;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  unit_of_measure: string;
  dispatch_value: number;
}

interface DispatchDetail {
  id: string;
  dispatch_number: string;
  dispatch_date: string;
  from_store_id: string;
  to_store_id: string;
  from_store_name: string;
  to_store_name: string;
  from_store_code: string;
  to_store_code: string;
  status: string;
  total_items: number;
  total_quantity: number;
  description: string | null;
  notes: string | null;
  employee_id: string | null;
  employee_name: string | null;
  items: DispatchItem[];
  created_at: string;
  updated_at: string;
}

export default function DispatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dispatch, setDispatch] = useState<DispatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDispatch();
  }, [id]);

  const fetchDispatch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/item-dispatch/${id}`);
      const data = await response.json();

      if (data.success && data.data) {
        setDispatch(data.data);
        setError('');
      } else {
        setError(data.error || 'Failed to load dispatch');
      }
    } catch (err) {
      setError('Error loading dispatch details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!dispatch) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/item-dispatch/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setDispatch(data.data);
        setError('');
      } else {
        setError(data.error || 'Failed to update dispatch status');
      }
    } catch (err) {
      setError('Error updating dispatch status');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canChangeStatus = (currentStatus: string, newStatus: string) => {
    const validTransitions: Record<string, string[]> = {
      pending: ['dispatched', 'cancelled'],
      dispatched: ['received', 'cancelled'],
      received: [],
      cancelled: [],
    };
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };

  const getAvailableTransitions = (status: string) => {
    const transitions: Record<string, { status: string; label: string }[]> = {
      pending: [
        { status: 'dispatched', label: 'Mark as Dispatched' },
        { status: 'cancelled', label: 'Cancel' },
      ],
      dispatched: [
        { status: 'received', label: 'Mark as Received' },
        { status: 'cancelled', label: 'Cancel' },
      ],
      received: [],
      cancelled: [],
    };
    return transitions[status] || [];
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex justify-center items-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dispatch) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'Dispatch not found'}</p>
          <Link
            href="/stock/dispatch"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dispatches
          </Link>
        </div>
      </div>
    );
  }

  const transitions = getAvailableTransitions(dispatch.status);
  const totalValue = dispatch.items.reduce(
    (sum, item) => sum + item.dispatch_value,
    0
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/stock/dispatch"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Dispatches
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {dispatch.dispatch_number}
            </h1>
            <p className="text-gray-600 mt-2">
              {new Date(dispatch.dispatch_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <span
              className={`px-4 py-2 rounded-full font-semibold text-base border ${getStatusColor(
                dispatch.status
              )}`}
            >
              {dispatch.status.charAt(0).toUpperCase() +
                dispatch.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2">
          {/* Store Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              Store Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* From Store */}
              <div>
                <p className="text-sm text-gray-600 mb-2">From Store (Source)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dispatch.from_store_code}
                </p>
                <p className="text-gray-700">{dispatch.from_store_name}</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center sm:justify-start">
                <div className="text-4xl text-blue-600 font-light">→</div>
              </div>

              {/* To Store */}
              <div>
                <p className="text-sm text-gray-600 mb-2">To Store (Destination)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dispatch.to_store_code}
                </p>
                <p className="text-gray-700">{dispatch.to_store_name}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {dispatch.description && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{dispatch.description}</p>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Items</h2>

            {dispatch.items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in this dispatch</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Batch
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Expiry
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Cost Price
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatch.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {item.item_code}
                              </div>
                              <div className="text-gray-600">
                                {item.item_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.batch_no || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.batch_expiry
                              ? new Date(item.batch_expiry).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            LKR {item.cost_price.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            LKR {item.dispatch_value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Item Totals */}
                <div className="mt-6 border-t pt-4 space-y-2 text-right">
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold w-24">
                      {dispatch.total_items}
                    </span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-600">Total Quantity:</span>
                    <span className="font-semibold w-24">
                      {dispatch.total_quantity}
                    </span>
                  </div>
                  <div className="flex justify-end gap-4 text-lg pt-2">
                    <span className="text-gray-900 font-bold">
                      Total Value:
                    </span>
                    <span className="font-bold w-24 text-blue-600">
                      LKR {totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Meta Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  Dispatch Date
                </p>
                <p className="text-gray-900 font-semibold">
                  {new Date(dispatch.dispatch_date).toLocaleDateString()}
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  Created
                </p>
                <p className="text-gray-900 font-semibold">
                  {new Date(dispatch.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {dispatch.employee_name && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-600 uppercase tracking-wider">
                    Created By
                  </p>
                  <p className="text-gray-900 font-semibold">
                    {dispatch.employee_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Actions */}
          {transitions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-2">
                {transitions.map((transition) => (
                  <button
                    key={transition.status}
                    onClick={() => handleStatusChange(transition.status)}
                    disabled={actionLoading}
                    className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                      transition.status === 'cancelled'
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {actionLoading ? 'Updating...' : transition.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {dispatch.status === 'received' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-700 font-semibold">✓ Completed</p>
              <p className="text-green-600 text-sm mt-2">
                This dispatch has been completed and received by the destination store.
              </p>
            </div>
          )}

          {dispatch.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-700 font-semibold">✗ Cancelled</p>
              <p className="text-red-600 text-sm mt-2">
                This dispatch has been cancelled.
              </p>
            </div>
          )}

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
            <p className="text-sm text-blue-600 uppercase tracking-wider font-semibold">
              Summary
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Items:</span>
                <span className="text-2xl font-bold text-blue-900">
                  {dispatch.total_items}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Quantity:</span>
                <span className="text-2xl font-bold text-blue-900">
                  {dispatch.total_quantity}
                </span>
              </div>
              <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
                <span className="text-blue-700 font-semibold">Total Value:</span>
                <span className="text-2xl font-bold text-blue-900">
                  LKR {totalValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}