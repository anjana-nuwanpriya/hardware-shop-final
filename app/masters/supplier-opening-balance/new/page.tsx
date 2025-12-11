'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface SupplierOpeningBalance {
  id: string;
  entry_number: string;
  entry_date: string;
  supplier_id: string;
  amount: number;
  balance_type: 'payable' | 'advance';
  notes: string | null;
  is_active: boolean;
}

export default function SupplierOpeningBalanceFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const isEdit = !!id && id !== 'new';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<SupplierOpeningBalance>>({
    entry_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    amount: 0,
    balance_type: 'payable',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
    if (isEdit) {
      fetchBalance();
    }
  }, [id]);

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

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/supplier-opening-balance/${id}`);
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
      // Validation
      if (!formData.supplier_id) {
        setError('Supplier is required');
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
      const url = isEdit ? `/api/supplier-opening-balance/${id}` : '/api/supplier-opening-balance';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/masters/supplier-opening-balance');
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
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Opening Balance' : 'Create Opening Balance'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEdit
              ? 'Update the supplier opening balance details'
              : 'Record outstanding balance from previous system'}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            ✅ Opening balance saved successfully! Redirecting...
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
          <div className="space-y-6">
            {/* Entry Number (Read-only if editing) */}
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry #</label>
                <input
                  type="text"
                  value={formData.entry_number || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
            )}

            {/* Entry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Date *</label>
              <input
                type="date"
                name="entry_date"
                value={formData.entry_date || ''}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Date when this balance was recorded (usually system start date)
              </p>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
              <select
                name="supplier_id"
                value={formData.supplier_id || ''}
                onChange={handleInputChange}
                required
                disabled={isEdit}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-sm text-gray-500 mt-1">Cannot change supplier on edit</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Rs.) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">Outstanding amount in local currency</p>
            </div>

            {/* Balance Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Balance Type *</label>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="balance_type"
                    value="payable"
                    checked={formData.balance_type === 'payable'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-700">
                    <strong>We Owe (Payable)</strong>
                    <p className="text-sm text-gray-500">
                      Supplier sent us goods, we haven't paid yet
                    </p>
                  </span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="balance_type"
                    value="advance"
                    checked={formData.balance_type === 'advance'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-gray-700">
                    <strong>They Owe (Advance)</strong>
                    <p className="text-sm text-gray-500">
                      We paid them in advance, they owe us goods/credit
                    </p>
                  </span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                placeholder="Any additional notes about this balance..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex gap-4 justify-between">
            <Link
              href="/masters/supplier-opening-balance"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Opening Balances</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Record all outstanding balances from before system migration</li>
            <li>This helps track historical financial data accurately</li>
            <li>Amounts will be included in supplier payment allocations</li>
            <li>Once created, entry number cannot be changed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}