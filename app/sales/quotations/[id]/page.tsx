'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface QuotationItem {
  id: string;
  item_id: string;
  item_name: string;
  batch_no?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_value: number;
  tax_value: number;
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
  valid_until: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  terms_conditions?: string;
  notes?: string;
  is_active: boolean;
  quotation_items?: QuotationItem[];
  created_at: string;
  updated_at: string;
}

export default function ViewQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [saleType, setSaleType] = useState('retail');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch quotation');

      const data = await response.json();
      console.log('Quotation data:', data);
      setQuotation(data.data);
      
      // Initialize selected items
      if (data.data?.quotation_items) {
        setSelectedItems(data.data.quotation_items.map((item: QuotationItem) => item.id));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotation) return;

    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }

    setConverting(true);
    try {
      const payload: Record<string, any> = {
        sale_type: saleType,
        payment_status: paymentStatus,
      };

      // Add optional fields if provided
      if (paymentMethod) {
        payload.payment_method = paymentMethod;
      }

      // Only include item_ids if not all items are selected
      if (quotation.quotation_items && selectedItems.length < quotation.quotation_items.length) {
        payload.item_ids = selectedItems;
      }

      console.log('Sending payload:', payload);

      const response = await fetch(`/api/quotations/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.message || 'Failed to convert quotation');
        setConverting(false);
        return;
      }

      alert('Quotation converted successfully');
      setShowConvertModal(false);
      router.push(`/sales/quotations`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to convert quotation');
      setConverting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      converted: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!quotation) return <div className="p-6">Quotation not found</div>;

  const items = quotation.quotation_items || [];
  const selectedItemsTotal = items
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.net_value, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{quotation.quotation_number}</h1>
          <span className={`inline-block mt-2 px-3 py-1 rounded text-xs font-medium ${getStatusBadge(quotation.status)}`}>
            {quotation.status}
          </span>
        </div>
        <div className="flex gap-2">
          {quotation.status === 'active' && (
            <>
              <Link
                href={`/sales/quotations/${id}/edit`}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                Edit
              </Link>
              <button
                onClick={() => setShowConvertModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Convert to Sale
              </button>
            </>
          )}
          <button
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
          >
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Info */}
          <div className="bg-white rounded shadow p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-semibold">
                  {new Date(quotation.quotation_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valid Until</p>
                <p className="text-lg font-semibold">
                  {new Date(quotation.valid_until).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Store Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Customer</h3>
              <p className="text-lg font-semibold">{quotation.customer_name}</p>
            </div>

            <div className="bg-white rounded shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Store</h3>
              <p className="text-lg font-semibold">{quotation.store_name}</p>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Items</h3>
            {items.length === 0 ? (
              <p className="text-gray-600">No items in this quotation</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Discount</th>
                      <th className="px-4 py-2 text-right">Tax</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-xs text-gray-600">{item.item_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{item.discount_value.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{item.tax_value.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-medium">{item.net_value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Terms & Notes */}
          {(quotation.terms_conditions || quotation.notes) && (
            <div className="bg-white rounded shadow p-6 space-y-4">
              {quotation.terms_conditions && (
                <div>
                  <h4 className="font-semibold mb-2">Terms & Conditions</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{quotation.terms_conditions}</p>
                </div>
              )}
              {quotation.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Totals */}
        <div className="bg-white rounded shadow p-6 h-fit">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="space-y-3 border-b pb-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{quotation.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium">-{quotation.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">{quotation.tax.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold mb-4">
            <span>Total:</span>
            <span>{quotation.total_amount.toFixed(2)}</span>
          </div>

          <div className="text-xs text-gray-600 space-y-1 text-right">
            <p>Created: {new Date(quotation.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(quotation.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Convert to Sale</h2>

            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sale Type</label>
                <select
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g., Cash, Card, Bank Transfer"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              {items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Items to Convert</label>
                  <div className="border rounded p-3 max-h-48 overflow-y-auto space-y-2">
                    {items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {item.item_name} ({item.quantity})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Selected total: {selectedItemsTotal.toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={converting || selectedItems.length === 0}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {converting ? 'Converting...' : 'Convert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}