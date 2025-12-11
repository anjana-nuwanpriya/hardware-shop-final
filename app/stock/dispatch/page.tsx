'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  code: string;
}

interface DispatchNote {
  id: string;
  dispatch_number: string;
  dispatch_date: string;
  from_store_id: string;
  to_store_id: string;
  status: string;
  total_items: number;
  total_quantity: number;
  employee_id: string | null;
  description: string | null;
  created_at: string;
}

interface DispatchDetail extends DispatchNote {
  from_store_name?: string;
  to_store_name?: string;
}

export default function DispatchListPage() {
  const [dispatches, setDispatches] = useState<DispatchDetail[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFromStore, setFilterFromStore] = useState('');
  const [filterToStore, setFilterToStore] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchDispatches();
  }, [searchTerm, filterStatus, filterFromStore, filterToStore]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterFromStore) params.append('from_store', filterFromStore);
      if (filterToStore) params.append('to_store', filterToStore);

      const response = await fetch(`/api/item-dispatch?${params}`);
      const data = await response.json();

      if (data.success) {
        const dispatchesWithNames = (data.data || []).map((d: DispatchNote) => ({
          ...d,
          from_store_name: stores.find((s) => s.id === d.from_store_id)?.name,
          to_store_name: stores.find((s) => s.id === d.to_store_id)?.name,
        }));
        setDispatches(dispatchesWithNames);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch dispatches');
      }
    } catch (err) {
      setError('Error fetching dispatches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dispatches</h1>
          <p className="text-gray-600">Manage inter-store stock transfers</p>
        </div>
        <Link
          href="/stock/dispatch/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          + Create Dispatch
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Dispatch #, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="dispatched">Dispatched</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* From Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Store
            </label>
            <select
              value={filterFromStore}
              onChange={(e) => setFilterFromStore(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.code} - {store.name}
                </option>
              ))}
            </select>
          </div>

          {/* To Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Store
            </label>
            <select
              value={filterToStore}
              onChange={(e) => setFilterToStore(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.code} - {store.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterFromStore('');
                setFilterToStore('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : dispatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">
            No dispatches found. Create one to get started!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-700 font-semibold">
                    Dispatch #
                  </th>
                  <th className="px-6 py-4 text-left text-gray-700 font-semibold">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-gray-700 font-semibold">
                    From Store
                  </th>
                  <th className="px-6 py-4 text-left text-gray-700 font-semibold">
                    To Store
                  </th>
                  <th className="px-6 py-4 text-right text-gray-700 font-semibold">
                    Items
                  </th>
                  <th className="px-6 py-4 text-right text-gray-700 font-semibold">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-center text-gray-700 font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-gray-700 font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((dispatch) => (
                  <tr
                    key={dispatch.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {dispatch.dispatch_number}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(dispatch.dispatch_date).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">
                        {dispatch.from_store_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">
                        {dispatch.to_store_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {dispatch.total_items}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {dispatch.total_quantity}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          dispatch.status
                        )}`}
                      >
                        {dispatch.status.charAt(0).toUpperCase() +
                          dispatch.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/stock/dispatch/${dispatch.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <strong>{dispatches.length}</strong> dispatch
              {dispatches.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}