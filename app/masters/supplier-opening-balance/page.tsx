'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SupplierOpeningBalance {
  id: string;
  entry_number: string;
  entry_date: string;
  supplier_id: string;
  supplier_name?: string;
  amount: number;
  balance_type: 'payable' | 'advance';
  notes: string | null;
  employee_id: string | null;
  employee_name?: string;
  is_active: boolean;
  created_at: string;
}

export default function SupplierOpeningBalancePage() {
  const router = useRouter();
  const [balances, setBalances] = useState<SupplierOpeningBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [balanceType, setBalanceType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSuppliers();
    fetchBalances();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?limit=1000');
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/supplier-opening-balance?limit=100';
      if (selectedSupplier) {
        url += `&supplier_id=${selectedSupplier}`;
      }
      if (balanceType !== 'all') {
        url += `&balance_type=${balanceType}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setBalances(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch opening balances');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch opening balances');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedSupplier('');
    setBalanceType('all');
    setSearchTerm('');
    setBalances([]);
    fetchBalances();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will mark the entry as inactive.')) return;

    try {
      const response = await fetch(`/api/supplier-opening-balance/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setBalances(balances.filter((b) => b.id !== id));
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error deleting entry');
    }
  };

  const getBalanceTypeBadge = (type: string) => {
    if (type === 'payable') {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
          We Owe
        </span>
      );
    }
    return (
      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
        They Owe
      </span>
    );
  };

  const getTotalAmount = (type?: string) => {
    return balances
      .filter((b) => !type || b.balance_type === type)
      .reduce((sum, b) => sum + b.amount, 0)
      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Supplier Opening Balances</h1>
          <p className="text-gray-600 mt-2">
            Manage outstanding balances from before system migration
          </p>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/masters/supplier-opening-balance/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            + Create Opening Balance
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Entry #
              </label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Supplier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Balance Type
              </label>
              <select
                value={balanceType}
                onChange={(e) => setBalanceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="payable">We Owe (Payable)</option>
                <option value="advance">They Owe (Advance)</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Apply Filters Button */}
          <button
            onClick={fetchBalances}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Apply Filters
          </button>
        </div>

        {/* Summary Cards */}
        {balances.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-gray-600 text-sm">We Owe (Payable)</p>
              <p className="text-2xl font-bold text-red-600">
                Rs. {getTotalAmount('payable')}
              </p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-gray-600 text-sm">They Owe (Advance)</p>
              <p className="text-2xl font-bold text-green-600">
                Rs. {getTotalAmount('advance')}
              </p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-gray-600 text-sm">Total Entries</p>
              <p className="text-2xl font-bold text-blue-600">{balances.length}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading opening balances...</p>
          </div>
        )}

        {/* Table */}
        {!loading && balances.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Entry #
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                      {balance.entry_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(balance.entry_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{balance.supplier_name}</td>
                    <td className="px-6 py-4">{getBalanceTypeBadge(balance.balance_type)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-right">
                      Rs.{' '}
                      {balance.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {balance.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Link
                          href={`/masters/supplier-opening-balance/${balance.id}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(balance.id)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && balances.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">
              No opening balances found. Create one to get started!
            </p>
            <button
              onClick={() => router.push('/masters/supplier-opening-balance/new')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
            >
              Create First Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}