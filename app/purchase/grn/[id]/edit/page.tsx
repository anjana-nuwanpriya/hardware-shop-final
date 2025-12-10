'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface GRNData {
  id: string;
  grn_number: string;
  invoice_number: string;
  invoice_date: string;
  description: string;
}

export default function GRNEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [grn, setGrn] = useState<GRNData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  useEffect(() => {
    fetchGRN();
  }, [id]);

  const fetchGRN = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-grns/${id}`);
      const result = await response.json();
      if (result.success) {
        const grnData = result.data;
        setGrn(grnData);
        setFormData({
          invoice_number: grnData.invoice_number || '',
          invoice_date: grnData.invoice_date || '',
          description: grnData.description || ''
        });
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
      alert('Failed to load GRN');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await fetch(`/api/purchase-grns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        alert('GRN updated successfully');
        router.push(`/purchase/grn/${id}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-500 mb-4">GRN not found</p>
          <a href="/purchase/grn" className="text-blue-600 hover:underline">
            Back to GRNs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit GRN: {grn.grn_number}</h1>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="space-y-4">
              {/* GRN Number - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GRN Number
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed">
                  {grn.grn_number}
                </div>
                <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., INV-2024-001"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description/Notes
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Only invoice details can be edited. To change items or quantities, please delete and recreate the GRN.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}