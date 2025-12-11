'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface SupplierOpeningBalance {
  id: string;
  entry_number: string;
  entry_date: string;
  supplier_id: string;
  supplier_name?: string;
  amount: number;
  balance_type: 'payable' | 'advance';
  notes: string | null;
  employee_id?: string;
  employee_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SupplierOpeningBalanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [balance, setBalance] = useState<SupplierOpeningBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, [id]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/supplier-opening-balance/${id}`);
      const result = await response.json();

      if (result.success) {
        setBalance(result.data);
      } else {
        setError('Opening balance not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load opening balance');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure? This will mark the entry as inactive.')) return;

    try {
      const response = await fetch(`/api/supplier-opening-balance/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        router.push('/masters/supplier-opening-balance');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error deleting entry');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">{error || 'Opening balance not found'}</p>
            <Link
              href="/masters/supplier-opening-balance"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-semibold"
            >
              ← Back to Opening Balances
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPayable = balance.balance_type === 'payable';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Opening Balance Details</h1>
            <p className="text-gray-600 mt-2">Entry #{balance.entry_number}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/masters/supplier-opening-balance/${id}/edit`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow p-8">
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Supplier */}
              <div>
                <p className="text-sm font-medium text-gray-500">Supplier</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{balance.supplier_name}</p>
              </div>

              {/* Entry Date */}
              <div>
                <p className="text-sm font-medium text-gray-500">Entry Date</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {new Date(balance.entry_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Created At */}
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(balance.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Balance Type */}
              <div>
                <p className="text-sm font-medium text-gray-500">Balance Type</p>
                <div className="mt-2">
                  {isPayable ? (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                      We Owe (Payable)
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                      They Owe (Advance)
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className={isPayable ? 'p-4 rounded-lg bg-red-50' : 'p-4 rounded-lg bg-green-50'}>
                <p className={isPayable ? 'text-sm text-red-600' : 'text-sm text-green-600'}>
                  Amount Outstanding
                </p>
                <p className={isPayable ? 'text-3xl font-bold text-red-700 mt-1' : 'text-3xl font-bold text-green-700 mt-1'}>
                  Rs.{' '}
                  {balance.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {balance.is_active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-400">Inactive</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {balance.notes && (
            <div className="mt-8 pt-8 border-t">
              <p className="text-sm font-medium text-gray-500">Notes</p>
              <p className="text-gray-700 mt-2 whitespace-pre-wrap">{balance.notes}</p>
            </div>
          )}

          {/* Employee Info */}
          {balance.employee_name && (
            <div className="mt-8 pt-8 border-t">
              <p className="text-sm font-medium text-gray-500">Created By</p>
              <p className="text-gray-700 mt-2">{balance.employee_name}</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How This Balance Works</h3>
          <div className="text-sm text-blue-800 space-y-2">
            {isPayable ? (
              <>
                <p>
                  <strong>We Owe Rs. {balance.amount.toLocaleString()}:</strong> This supplier sent us goods
                  before system migration and we haven't paid them yet.
                </p>
                <p>
                  When you make a payment to this supplier, the amount will be allocated against this opening
                  balance first.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>They Owe Rs. {balance.amount.toLocaleString()}:</strong> We paid this supplier in
                  advance before system migration.
                </p>
                <p>
                  When you create a new GRN for this supplier, the amount will be reduced from this advance
                  first.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            href="/masters/supplier-opening-balance"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            ← Back to Opening Balances
          </Link>
        </div>
      </div>
    </div>
  );
}