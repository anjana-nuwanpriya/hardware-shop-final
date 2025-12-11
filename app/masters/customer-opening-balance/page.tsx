'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CustomerOpeningBalance {
  id: string;
  entry_number: string;
  entry_date: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  balance_type: 'receivable' | 'advance';
  notes: string | null;
  employee_id: string | null;
  employee_name?: string;
  is_active: boolean;
  created_at: string;
}

export default function CustomerOpeningBalancePage() {
  const router = useRouter();
  const [balances, setBalances] = useState<CustomerOpeningBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [balanceType, setBalanceType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchBalances();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=1000');
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/customer-opening-balance?limit=100';
      if (selectedCustomer) {
        url += `&customer_id=${selectedCustomer}`;
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
    setSelectedCustomer('');
    setBalanceType('all');
    setSearchTerm('');
    setBalances([]);
    fetchBalances();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will mark the entry as inactive.')) return;

    try {
      const response = await fetch(`/api/customer-opening-balance/${id}`, {
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
    if (type === 'receivable') {
      return (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          They Owe Us
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
        We Owe
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
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Customer Opening Balances</h1>
          <p className="text-xs text-gray-600 mt-1">
            Manage outstanding balances from before system migration
          </p>
        </div>

        {/* Create Button */}
        <div className="mb-3">
          <button
            onClick={() => router.push('/masters/customer-opening-balance/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded text-xs"
          >
            + Create Opening Balance
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded shadow p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search Entry #
              </label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Balance Type
              </label>
              <select
                value={balanceType}
                onChange={(e) => setBalanceType(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="receivable">They Owe Us (Receivable)</option>
                <option value="advance">We Owe (Advance)</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-1 px-3 rounded text-xs"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Apply Filters Button */}
          <button
            onClick={fetchBalances}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-xs"
          >
            Apply Filters
          </button>
        </div>

        {/* Summary Cards */}
        {balances.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
              <p className="text-gray-600 text-xs">They Owe Us (Receivable)</p>
              <p className="text-lg font-bold text-blue-600">
                Rs. {getTotalAmount('receivable')}
              </p>
            </div>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
              <p className="text-gray-600 text-xs">We Owe (Advance)</p>
              <p className="text-lg font-bold text-purple-600">
                Rs. {getTotalAmount('advance')}
              </p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
              <p className="text-gray-600 text-xs">Total Entries</p>
              <p className="text-lg font-bold text-green-600">{balances.length}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2 text-xs">Loading opening balances...</p>
          </div>
        )}

        {/* Table */}
        {!loading && balances.length > 0 && (
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Entry #
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Notes</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-blue-600">
                      {balance.entry_number}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(balance.entry_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{balance.customer_name}</td>
                    <td className="px-3 py-2">{getBalanceTypeBadge(balance.balance_type)}</td>
                    <td className="px-3 py-2 font-semibold text-right">
                      Rs.{' '}
                      {balance.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                      {balance.notes || '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <Link
                          href={`/masters/customer-opening-balance/${balance.id}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(balance.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-xs"
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
          <div className="bg-white rounded shadow p-6 text-center">
            <p className="text-gray-600 text-sm">
              No opening balances found. Create one to get started!
            </p>
            <button
              onClick={() => router.push('/masters/customer-opening-balance/new')}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded text-xs"
            >
              Create First Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}