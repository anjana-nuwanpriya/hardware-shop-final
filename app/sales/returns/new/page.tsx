'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  code: string;
  name: string;
}

interface LineItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  original_qty: number;
  return_qty: number;
  unit_price: number;
  discount_percent: number;
  discount_value: number;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  invoice_number: string;
  total_amount: number;
  sales_retail_items: Array<{
    id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
    discount_value: number;
    items: Item;
  }>;
}

const RETURN_REASONS = [
  'defective',
  'wrong_item',
  'customer_request',
  'expired',
  'damaged_in_transit',
  'other',
];

const REFUND_METHODS = ['cash', 'bank_transfer', 'credit_note', 'card_refund'];

export default function NewSalesReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Form
  const [formData, setFormData] = useState({
    store_id: '',
    customer_id: '',
    employee_id: '',
    sales_retail_id: '',
    return_reason: 'defective',
    refund_method: 'cash',
    description: '',
    items: [
      {
        id: '0',
        item_id: '',
        item_code: '',
        item_name: '',
        original_qty: 0,
        return_qty: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_value: 0,
      } as LineItem,
    ],
  });

  // Fetch initial data
  useEffect(() => {
    fetchStores();
    fetchCustomers();
  }, []);

  // Fetch sales when customer and store change
  useEffect(() => {
    if (formData.customer_id && formData.store_id) {
      fetchSales();
    } else {
      setSales([]);
      setSelectedSale(null);
    }
  }, [formData.customer_id, formData.store_id]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const data = await res.json();
      if (data.data) {
        setStores(data.data);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.data) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchSales = async () => {
    try {
      const params = new URLSearchParams();
      if (formData.customer_id) params.append('customer_id', formData.customer_id);
      if (formData.store_id) params.append('store_id', formData.store_id);
      params.append('payment_status', 'paid');

      const url = `/api/sales-retail${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.data) {
        setSales(data.data);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    }
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setFormData({
      ...formData,
      sales_retail_id: sale.id,
      items: sale.sales_retail_items.map((item, idx) => ({
        id: String(idx),
        item_id: item.item_id,
        item_code: item.items.code,
        item_name: item.items.name,
        original_qty: item.quantity,
        return_qty: 0,
        unit_price: item.unit_price,
        discount_percent: 0,
        discount_value: 0,
      })),
    });
  };

  const handleAddItem = () => {
    const newId = String(Math.max(...formData.items.map((i) => parseInt(i.id) || 0), 0) + 1);
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          id: newId,
          item_id: '',
          item_code: '',
          item_name: '',
          original_qty: 0,
          return_qty: 1,
          unit_price: 0,
          discount_percent: 0,
          discount_value: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'return_qty') {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
      if (numValue > item.original_qty) {
        setError(
          `Cannot return more than ${item.original_qty} units of ${item.item_name}`
        );
        return;
      }
      item.return_qty = Math.max(0, numValue);
    } else if (field === 'unit_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      item.unit_price = numValue;
    } else if (field === 'discount_value') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      item.discount_value = numValue;
    } else {
      (item[field] as unknown) = value;
    }

    setFormData({ ...formData, items: newItems });
    setError('');
  };

  const calculateLineTotal = (item: LineItem) => {
    const subtotal = item.unit_price * item.return_qty;
    const discountValue = item.discount_value || 0;
    return subtotal - discountValue;
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + calculateLineTotal(item), 0);
  };

  const validateForm = () => {
    if (!formData.customer_id) {
      setError('Select a customer');
      return false;
    }

    if (!formData.store_id) {
      setError('Select a store');
      return false;
    }

    if (!formData.return_reason) {
      setError('Select a return reason');
      return false;
    }

    const itemsToReturn = formData.items.filter((item) => item.return_qty > 0);
    if (itemsToReturn.length === 0) {
      setError('Select at least one item to return');
      return false;
    }

    for (const item of itemsToReturn) {
      if (!item.item_id) {
        setError('All items must have item_id');
        return false;
      }
      if (item.return_qty <= 0) {
        setError('All items must have return quantity > 0');
        return false;
      }
      if (item.unit_price <= 0) {
        setError('All items must have price > 0');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const itemsToReturn = formData.items.filter((item) => item.return_qty > 0);

      const res = await fetch('/api/sales-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          store_id: formData.store_id,
          sales_retail_id: formData.sales_retail_id || null,
          employee_id: formData.employee_id || null,
          return_reason: formData.return_reason,
          refund_method: formData.refund_method,
          description: formData.description || null,
          items: itemsToReturn.map((item) => ({
            item_id: item.item_id,
            return_qty: item.return_qty,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            discount_value: item.discount_value,
            batch_no: null,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create return');
      }

      const result = await res.json();
      router.push(`/sales/returns?success=${result.data.return_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create return');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/sales/returns" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Back to Returns
        </Link>
        <h1 className="text-3xl font-bold mt-2">New Retail Return</h1>
        <p className="text-gray-600 text-sm mt-1">Process a customer return and generate refund</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Customer & Store Selection */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <select
              value={formData.return_reason}
              onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RETURN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refund Method</label>
            <select
              value={formData.refund_method}
              onChange={(e) => setFormData({ ...formData, refund_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REFUND_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Select from existing sale */}
        {formData.customer_id && formData.store_id && sales.length > 0 && (
          <div className="border-t pt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-3">Select from Previous Sale (Optional)</h3>
            <div className="space-y-2">
              {sales.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => handleSelectSale(sale)}
                  className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                    selectedSale?.id === sale.id
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="font-medium">{sale.invoice_number}</div>
                  <div className="text-sm text-gray-600">
                    {sale.sales_retail_items.length} items | Total: Rs.{' '}
                    {sale.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items Section */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Return Items</h2>

          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={item.id} className="border rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-7 gap-2 items-end">
                  {/* Item Name */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Item {item.item_name && <span className="text-green-600 ml-1">✓</span>}
                    </label>
                    <input
                      type="text"
                      value={item.item_name || ''}
                      readOnly
                      placeholder="Item from sale..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>

                  {/* Original Qty */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Orig Qty</label>
                    <input
                      type="number"
                      value={item.original_qty}
                      readOnly
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>

                  {/* Return Qty */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Return Qty *</label>
                    <input
                      type="number"
                      value={item.return_qty}
                      onChange={(e) => handleItemChange(index, 'return_qty', e.target.value)}
                      min="0"
                      className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                        item.return_qty > item.original_qty
                          ? 'border-red-300 bg-red-50 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      step="0.01"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Discount</label>
                    <input
                      type="number"
                      value={item.discount_value}
                      onChange={(e) => handleItemChange(index, 'discount_value', e.target.value)}
                      step="0.01"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.filter((i) => i.return_qty > 0).length <= 1}
                    className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>

                {/* Line Total */}
                {item.return_qty > 0 && (
                  <div className="mt-3 flex justify-end">
                    <div className="text-right">
                      <span className="text-xs text-gray-600 mr-2">Refund: </span>
                      <span className="font-semibold">
                        Rs. {calculateLineTotal(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total Section */}
        {total > 0 && (
          <div className="border-t pt-6 bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-semibold">Total Refund Amount</span>
              <span className="text-3xl font-bold text-green-600">
                Rs. {total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end border-t pt-6">
          <Link
            href="/sales/returns"
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || total === 0}
            className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Processing...' : 'Create Return'}
          </button>
        </div>
      </form>
    </div>
  );
}