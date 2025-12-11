'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface QuotationItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  net_value: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  customer_id: string;
  customer_name: string;
  store_id: string;
  store_name: string;
  total_amount: number;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  valid_until: string;
  is_active: boolean;
  created_at: string;
  subtotal: number;
  discount: number;
  tax: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: {
    quotations: Quotation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetchQuotations();
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch stores');

      const data = await response.json();
      setStores(data.data || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const fetchQuotations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/quotations', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch quotations`);
      }

      const data: ApiResponse = await response.json();

      console.log('API Response:', data);

      // Handle response structure - API returns { success, data: { quotations, pagination } }
      if (data.success && data.data && data.data.quotations) {
        const quotationsList = data.data.quotations;
        
        if (Array.isArray(quotationsList)) {
          console.log('Quotations loaded:', quotationsList.length);
          setQuotations(quotationsList);
        } else {
          console.error('quotations is not an array:', typeof quotationsList);
          setError('Invalid data structure from server');
          setQuotations([]);
        }
      } else {
        console.error('API response structure invalid:', data);
        setError(data.error || 'Failed to fetch quotations');
        setQuotations([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error:', message);
      setError(message);
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete quotation');
      }

      setQuotations(quotations.filter(q => q.id !== id));
      alert('Quotation deleted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${message}`);
    } finally {
      setDeleting(null);
    }
  };

  // Filter quotations
  const filteredQuotations = quotations.filter((q) => {
    if (statusFilter && q.status !== statusFilter) return false;
    if (storeFilter && q.store_id !== storeFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      converted: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quotations</h1>
        <Link
          href="/sales/quotations/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Quotation
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Store</label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchQuotations}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-gray-600">Loading quotations...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredQuotations.length === 0 && !error && (
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-gray-600">
            {quotations.length === 0
              ? 'No quotations found. Create your first quotation.'
              : 'No quotations match your filters.'}
          </p>
        </div>
      )}

      {/* Quotations Table */}
      {!loading && filteredQuotations.length > 0 && (
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Store</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Valid Until</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/sales/quotations/${quotation.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {quotation.quotation_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium">{quotation.customer_name}</p>
                    </td>
                    <td className="px-6 py-3">{quotation.store_name}</td>
                    <td className="px-6 py-3">
                      {new Date(quotation.quotation_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      {new Date(quotation.valid_until).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {quotation.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-medium ${getStatusBadge(
                          quotation.status
                        )}`}
                      >
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/sales/quotations/${quotation.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View
                        </Link>
                        {quotation.status === 'active' && (
                          <Link
                            href={`/sales/quotations/${quotation.id}/edit`}
                            className="text-amber-600 hover:text-amber-800 text-sm"
                          >
                            Edit
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(quotation.id)}
                          disabled={deleting === quotation.id}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          {deleting === quotation.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && quotations.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded shadow p-4">
            <p className="text-gray-600 text-sm">Total Quotations</p>
            <p className="text-2xl font-bold">{quotations.length}</p>
          </div>
          <div className="bg-white rounded shadow p-4">
            <p className="text-gray-600 text-sm">Active</p>
            <p className="text-2xl font-bold">
              {quotations.filter((q) => q.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded shadow p-4">
            <p className="text-gray-600 text-sm">Converted</p>
            <p className="text-2xl font-bold">
              {quotations.filter((q) => q.status === 'converted').length}
            </p>
          </div>
          <div className="bg-white rounded shadow p-4">
            <p className="text-gray-600 text-sm">Total Value</p>
            <p className="text-2xl font-bold">
              {quotations.reduce((sum, q) => sum + q.total_amount, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}