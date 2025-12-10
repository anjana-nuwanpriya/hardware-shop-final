/**
 * Page Component: /app/stock/opening-stock/page.tsx
 * Opening Stock Management - List and Create
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OpeningStockEntry {
  id: string;
  ref_number: string;
  entry_date: string;
  store_id: string;
  stores?: { code: string; name: string };
  supplier_id?: string;
  suppliers?: { name: string };
  total_value: number;
  total_discount: number;
  net_total: number;
  is_active: boolean;
  created_at: string;
}

export default function OpeningStockPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<OpeningStockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    storeId: '',
    startDate: '',
    endDate: '',
  });

  const limit = 10;

  useEffect(() => {
    fetchEntries();
  }, [currentPage, filters]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((currentPage - 1) * limit).toString(),
      });

      if (filters.storeId) params.append('store_id', filters.storeId);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const response = await fetch(`/api/opening-stock?${params}`);
      const data = await response.json();

      if (data.success) {
        setEntries(data.data || []);
        setTotalPages(Math.ceil(data.pagination.total / limit));
      } else {
        console.error('Error fetching entries:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ storeId: '', startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Opening Stock</h1>
              <p className="mt-2 text-gray-600">Manage opening stock entries for your stores</p>
            </div>
            <Link
              href="/stock/opening-stock/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + New Opening Stock
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
                <input
                  type="text"
                  placeholder="Filter by store..."
                  value={filters.storeId}
                  onChange={(e) => handleFilterChange('storeId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleClearFilters}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No opening stock entries found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Net Total
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          {entry.ref_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.stores?.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.suppliers?.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                          {entry.total_value.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                          {entry.net_total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              entry.is_active
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {entry.is_active ? 'Pending' : 'Finalized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() =>
                              router.push(`/stock/opening-stock/${entry.id}`)
                            }
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}