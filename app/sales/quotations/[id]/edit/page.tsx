'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Item {
  id: string;
  code: string;
  name: string;
  retail_price: number;
  wholesale_price: number;
  tax_method: string;
  tax_rate: number;
  unit_of_measure?: string;
}

interface QuotationItem {
  id: string;
  item_id: string;
  item?: Item;
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
  customer_id: string;
  store_id: string;
  valid_until: string;
  terms_conditions?: string;
  notes?: string;
  status: string;
  items: QuotationItem[];
}

interface Customer {
  id: string;
  name: string;
  type: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [selectedDiscount, setSelectedDiscount] = useState('0');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotRes, customersRes, storesRes, itemsRes] = await Promise.all([
        fetch(`/api/quotations/${id}`, { credentials: 'include' }),
        fetch('/api/customers', { credentials: 'include' }),
        fetch('/api/stores', { credentials: 'include' }),
        fetch('/api/items', { credentials: 'include' }),
      ]);

      if (quotRes.ok) {
        const data = await quotRes.json();
        const quot = data.data;
        setQuotation(quot);
        setCustomerId(quot.customer_id);
        setStoreId(quot.store_id);
        setValidUntil(quot.valid_until);
        setTerms(quot.terms_conditions || '');
        setNotes(quot.notes || '');
        setQuotationItems(quot.items);
      }

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.data || []);
      }

      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.data || []);
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedPrice = (item: Item | undefined) => {
    if (!item) return 0;
    const customer = customers.find(c => c.id === customerId);
    if (customer?.type === 'wholesale') return item.wholesale_price;
    return item.retail_price;
  };

  const calculateLineTotals = (item: Item, quantity: number, unitPrice: number, discountPercent: number) => {
    const lineTotal = quantity * unitPrice;
    const discountValue = (lineTotal * discountPercent) / 100;
    const afterDiscount = lineTotal - discountValue;
    
    let taxValue = 0;
    if (item.tax_method === 'exclusive') {
      taxValue = (afterDiscount * item.tax_rate) / 100;
    } else if (item.tax_method === 'inclusive') {
      taxValue = (afterDiscount * item.tax_rate) / (100 + item.tax_rate);
    }

    const netValue = afterDiscount + (item.tax_method === 'exclusive' ? taxValue : 0);
    
    return { discountValue, taxValue, netValue };
  };

  const addItem = () => {
    if (!selectedItemId || !selectedQuantity) {
      alert('Please select item and quantity');
      return;
    }

    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    const quantity = parseFloat(selectedQuantity);
    const discount = parseFloat(selectedDiscount) || 0;
    const unitPrice = getSuggestedPrice(item);

    const { discountValue, taxValue, netValue } = calculateLineTotals(item, quantity, unitPrice, discount);

    const newItem: QuotationItem = {
      id: `new-${Date.now()}`,
      item_id: selectedItemId,
      item,
      quantity,
      unit_price: unitPrice,
      discount_percent: discount,
      discount_value: discountValue,
      tax_value: taxValue,
      net_value: netValue,
    };

    setQuotationItems([...quotationItems, newItem]);
    setSelectedItemId('');
    setSelectedQuantity('1');
    setSelectedDiscount('0');
  };

  const removeItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = quotationItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalDiscount = quotationItems.reduce((sum, item) => sum + item.discount_value, 0);
    const totalTax = quotationItems.reduce((sum, item) => sum + item.tax_value, 0);
    const totalAmount = quotationItems.reduce((sum, item) => sum + item.net_value, 0);

    return { subtotal, totalDiscount, totalTax, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId || !storeId || !validUntil || quotationItems.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          valid_until: validUntil,
          terms_conditions: terms || null,
          notes: notes || null,
          items: quotationItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            discount_value: item.discount_value,
            tax_value: item.tax_value,
            net_value: item.net_value,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to update quotation');
        return;
      }

      router.push(`/sales/quotations/${id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update quotation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!quotation) return <div className="p-6">Quotation not found</div>;

  const { subtotal, totalDiscount, totalTax, totalAmount } = calculateTotals();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Edit Quotation {quotation.quotation_number}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Customer</label>
              <select
                value={customerId}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Cannot change customer</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Store</label>
              <select
                value={storeId}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"
              >
                <option value="">Select Store</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Cannot change store</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valid Until *</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
              <input
                type="text"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter terms and conditions"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={3}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Items</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Item</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                <option value="">Select Item</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={selectedDiscount}
                onChange={(e) => setSelectedDiscount(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addItem}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Items Table */}
          {quotationItems.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Discount</th>
                    <th className="px-4 py-2 text-right">Tax</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationItems.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{item.item?.name}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{item.discount_value.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{item.tax_value.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">{item.net_value.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {quotationItems.length === 0 && (
            <div className="text-center py-6 text-gray-500">No items added</div>
          )}
        </div>

        {/* Totals Section */}
        {quotationItems.length > 0 && (
          <div className="bg-white rounded shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div></div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Discount:</span>
                  <span className="font-medium">-{totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Tax:</span>
                  <span className="font-medium">{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Grand Total:</span>
                  <span>{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting || quotationItems.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update Quotation'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}