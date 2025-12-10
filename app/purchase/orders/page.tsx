'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  supplier_id: string;
  supplier_name?: string;
  store_id: string;
  store_name?: string;
  expected_delivery_date: string;
  status: 'pending' | 'sent' | 'partial' | 'received' | 'cancelled';
  total_amount: number;
  items_count?: number;
  created_at: string;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all' 
        ? '/api/purchase-orders'
        : `/api/purchase-orders?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.data || []);
    } catch (err) {
      setError('Failed to load purchase orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      partial: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading purchase orders...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Link
          href="/purchase/orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Create PO
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
          Filter by Status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Store
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                PO Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Expected Delivery
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No purchase orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-blue-600">
                    <Link href={`/purchase/orders/${order.id}`}>
                      {order.po_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {order.supplier_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {order.store_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(order.po_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(order.expected_delivery_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Rs. {order.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/purchase/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-800"
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
    </div>
  );
}