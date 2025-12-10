'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface GRNDetail {
  id: string;
  grn_number: string;
  grn_date: string;
  total_amount: number;
  payment_status: string;
  description: string;
  suppliers: any;
  stores: any;
  items: any[];
  allocations: any[];
}

export default function GRNDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [grn, setGrn] = useState<GRNDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState<any>(null);

  useEffect(() => {
    fetchGRN();
    fetchOutstanding();
  }, [id]);

  const fetchGRN = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchase-grns/${id}`);
      const result = await response.json();
      if (result.success) {
        setGrn(result.data);
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
      alert('Failed to load GRN');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstanding = async () => {
    try {
      const response = await fetch(`/api/purchase-grns/${id}/outstanding`);
      const result = await response.json();
      if (result.success) {
        setOutstanding(result.data);
      }
    } catch (error) {
      console.error('Error fetching outstanding:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete GRN ${grn?.grn_number}?`)) return;

    try {
      const response = await fetch(`/api/purchase-grns/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert('GRN deleted successfully');
        router.push('/purchase/grn');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete GRN');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500 mb-4">GRN not found</p>
          <Link href="/purchase/grn" className="text-blue-600 hover:underline">
            Back to GRNs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{grn.grn_number}</h1>
              <p className="text-gray-600 mt-2">{formatDate(grn.grn_date)}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                grn.payment_status
              )}`}
            >
              {grn.payment_status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Supplier & Store Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supplier */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Supplier</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{grn.suppliers?.name || 'N/A'}</p>
              </div>
              {grn.suppliers?.contact_person && (
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-medium text-gray-900">{grn.suppliers.contact_person}</p>
                </div>
              )}
              {grn.suppliers?.phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{grn.suppliers.phone}</p>
                </div>
              )}
              {grn.suppliers?.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{grn.suppliers.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Store */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Store</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{grn.stores?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Code</p>
                <p className="font-medium text-gray-900">{grn.stores?.code || 'N/A'}</p>
              </div>
              {grn.stores?.address && (
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium text-gray-900">{grn.stores.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Item</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Batch</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Expiry</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Qty</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Cost</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Discount</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-900">Net Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {grn.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.items?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-600">{item.items?.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{item.batch_no || '-'}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {item.batch_expiry
                        ? new Date(item.batch_expiry).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {item.received_qty}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatCurrency(item.cost_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {item.discount_percent}% ({formatCurrency(item.discount_value)})
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.net_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Payment Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Payment Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <p className="text-gray-600">Total Amount</p>
                <p className="font-bold text-lg text-gray-900">
                  {formatCurrency(outstanding?.total_amount || 0)}
                </p>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <p className="text-gray-600">Paid Amount</p>
                <p className="font-bold text-lg text-green-600">
                  {formatCurrency(outstanding?.paid_amount || 0)}
                </p>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <p className="text-gray-600">Outstanding</p>
                <p className="font-bold text-lg text-red-600">
                  {formatCurrency(outstanding?.outstanding || 0)}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-600">% Paid</p>
                <p className="font-bold text-lg text-blue-600">
                  {outstanding?.percentage_paid || 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Payment Allocations */}
          {grn.allocations && grn.allocations.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Payments</h2>
              <div className="space-y-3">
                {grn.allocations.map((allocation: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center pb-2 border-b last:border-b-0"
                  >
                    <div>
                      <p className="text-sm text-gray-600">Invoice {allocation.invoice_number}</p>
                      <p className="text-xs text-gray-500">
                        {allocation.supplier_payments?.payment_date
                          ? new Date(allocation.supplier_payments.payment_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(allocation.allocation_amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {grn.description && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Description</h2>
            <p className="text-gray-700">{grn.description}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            href="/purchase/grn"
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-900 text-center"
          >
            Back to List
          </Link>
          {grn.payment_status !== 'paid' && (
            <Link
              href={`/purchase/grn/${grn.id}/edit`}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-center"
            >
              Edit
            </Link>
          )}
          <button
            onClick={handleDelete}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}