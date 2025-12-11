'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type?: string;
}

interface CustomerOpeningBalance {
  id: string;
  entry_number: string;
  entry_date: string;
  customer_id: string;
  amount: number;
  balance_type: 'receivable' | 'advance';
  notes: string | null;
  is_active: boolean;
}

// ========== FORM PAGE ==========
export default function CustomerOpeningBalanceFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id && id !== 'new';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<CustomerOpeningBalance>>({
    entry_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    amount: 0,
    balance_type: 'receivable',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
    if (isEdit) {
      fetchBalance();
    }
  }, [id]);

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

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/customer-opening-balance/${id}`);
      const result = await response.json();

      if (result.success) {
        setFormData(result.data);
      } else {
        setError('Failed to load opening balance');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load opening balance');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.customer_id) {
        setError('Customer is required');
        setSaving(false);
        return;
      }

      if (!formData.amount || formData.amount <= 0) {
        setError('Amount must be greater than 0');
        setSaving(false);
        return;
      }

      if (!formData.entry_date) {
        setError('Entry date is required');
        setSaving(false);
        return;
      }

      const method = isEdit ? 'PATCH' : 'POST';
      const url = isEdit ? `/api/customer-opening-balance/${id}` : '/api/customer-opening-balance';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/masters/customer-opening-balance');
        }, 1500);
      } else {
        setError(result.error || 'Failed to save opening balance');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save opening balance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2 text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Opening Balance' : 'Create Opening Balance'}
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            {isEdit
              ? 'Update the customer opening balance details'
              : 'Record outstanding balance from previous system'}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs">
            ✅ Opening balance saved successfully! Redirecting...
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4">
          <div className="space-y-4">
            {/* Entry Number (Read-only if editing) */}
            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entry #</label>
                <input
                  type="text"
                  value={formData.entry_number || ''}
                  disabled
                  className="w-full px-3 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed text-xs"
                />
              </div>
            )}

            {/* Entry Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entry Date *</label>
              <input
                type="date"
                name="entry_date"
                value={formData.entry_date || ''}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-0.5">
                Date when this balance was recorded (usually system start date)
              </p>
            </div>

            {/* Customer */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
              <select
                name="customer_id"
                value={formData.customer_id || ''}
                onChange={handleInputChange}
                required
                disabled={isEdit}
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-0.5">Cannot change customer on edit</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-0.5">Outstanding amount in local currency</p>
            </div>

            {/* Balance Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Balance Type *</label>
              <div className="space-y-2">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="balance_type"
                    value="receivable"
                    checked={formData.balance_type === 'receivable'}
                    onChange={handleInputChange}
                    className="w-3 h-3 text-blue-600 mt-0.5"
                  />
                  <span className="ml-2 text-gray-700">
                    <strong className="text-xs">They Owe Us (Receivable)</strong>
                    <p className="text-xs text-gray-500">
                      Customer bought goods, hasn't paid yet
                    </p>
                  </span>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="balance_type"
                    value="advance"
                    checked={formData.balance_type === 'advance'}
                    onChange={handleInputChange}
                    className="w-3 h-3 text-blue-600 mt-0.5"
                  />
                  <span className="ml-2 text-gray-700">
                    <strong className="text-xs">We Owe (Advance)</strong>
                    <p className="text-xs text-gray-500">
                      Customer paid us in advance, we owe them goods
                    </p>
                  </span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                placeholder="Any additional notes about this balance..."
                rows={3}
                className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-4 flex gap-2 justify-between">
            <Link
              href="/masters/customer-opening-balance"
              className="px-4 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-semibold text-xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold text-xs"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
          <h3 className="font-semibold text-blue-900 mb-1 text-xs">ℹ️ About Opening Balances</h3>
          <ul className="text-xs text-blue-800 space-y-0.5 list-disc list-inside">
            <li>Record all outstanding balances from before system migration</li>
            <li>This helps track historical financial data accurately</li>
            <li>Amounts will be included in customer payment allocations</li>
            <li>Once created, entry number cannot be changed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ========== DETAIL PAGE ==========
interface CustomerOpeningBalanceDetail {
  id: string;
  entry_number: string;
  entry_date: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  balance_type: 'receivable' | 'advance';
  notes: string | null;
  employee_id?: string;
  employee_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function CustomerOpeningBalanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [balance, setBalance] = useState<CustomerOpeningBalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, [id]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/customer-opening-balance/${id}`);
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
      const response = await fetch(`/api/customer-opening-balance/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        router.push('/masters/customer-opening-balance');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error deleting entry');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2 text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="min-h-screen bg-gray-50 p-3">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-700 text-xs">{error || 'Opening balance not found'}</p>
            <Link
              href="/masters/customer-opening-balance"
              className="mt-2 inline-block text-blue-600 hover:text-blue-800 font-semibold text-xs"
            >
              ← Back to Opening Balances
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isReceivable = balance.balance_type === 'receivable';

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-3 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Opening Balance Details</h1>
            <p className="text-xs text-gray-600 mt-0.5">Entry #{balance.entry_number}</p>
          </div>
          <div className="flex gap-1">
            <Link
              href={`/masters/customer-opening-balance/${id}/edit`}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-xs"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded shadow p-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Left Column */}
            <div className="space-y-2.5">
              {/* Customer */}
              <div>
                <p className="text-xs font-medium text-gray-500">Customer</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{balance.customer_name}</p>
              </div>

              {/* Entry Date */}
              <div>
                <p className="text-xs font-medium text-gray-500">Entry Date</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {new Date(balance.entry_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Created At */}
              <div>
                <p className="text-xs font-medium text-gray-500">Created</p>
                <p className="text-xs text-gray-600 mt-0.5">
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
            <div className="space-y-2.5">
              {/* Balance Type */}
              <div>
                <p className="text-xs font-medium text-gray-500">Balance Type</p>
                <div className="mt-1">
                  {isReceivable ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      They Owe Us (Receivable)
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                      We Owe (Advance)
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className={isReceivable ? 'p-2.5 rounded bg-blue-50' : 'p-2.5 rounded bg-purple-50'}>
                <p className={isReceivable ? 'text-xs text-blue-600' : 'text-xs text-purple-600'}>
                  Amount Outstanding
                </p>
                <p className={isReceivable ? 'text-lg font-bold text-blue-700 mt-0.5' : 'text-lg font-bold text-purple-700 mt-0.5'}>
                  Rs.{' '}
                  {balance.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-medium text-gray-500">Status</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
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
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{balance.notes}</p>
            </div>
          )}

          {/* Employee Info */}
          {balance.employee_name && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-500">Created By</p>
              <p className="text-xs text-gray-700 mt-1">{balance.employee_name}</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2.5">
          <h3 className="font-semibold text-blue-900 mb-1 text-xs">ℹ️ How This Balance Works</h3>
          <div className="text-xs text-blue-800 space-y-0.5">
            {isReceivable ? (
              <>
                <p>
                  <strong>They Owe Rs. {balance.amount.toLocaleString()}:</strong> This customer bought goods
                  before system migration and hasn't paid us yet.
                </p>
                <p>
                  When you receive a payment from this customer, the amount will be allocated against this opening
                  balance first.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>We Owe Rs. {balance.amount.toLocaleString()}:</strong> This customer paid us in advance
                  before system migration.
                </p>
                <p>
                  When you create a new sales invoice for this customer, the amount will be reduced from this advance
                  first.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-3">
          <Link
            href="/masters/customer-opening-balance"
            className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
          >
            ← Back to Opening Balances
          </Link>
        </div>
      </div>
    </div>
  );
}