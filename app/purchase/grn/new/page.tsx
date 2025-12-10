'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface GRNItem {
  item_id: string;
  batch_no: string;
  batch_expiry: string;
  received_qty: number;
  cost_price: number;
  discount_percent: number;
}

export default function GRNCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    supplier_id: '',
    store_id: '',
    po_reference_id: '',
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  const [lineItems, setLineItems] = useState<GRNItem[]>([
    { item_id: '', batch_no: '', batch_expiry: '', received_qty: 0, cost_price: 0, discount_percent: 0 }
  ]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    if (formData.supplier_id) fetchPurchaseOrders();
  }, [formData.supplier_id]);

  const fetchMasters = async () => {
    const [suppliersRes, storesRes, itemsRes] = await Promise.all([
      supabase.from('suppliers').select('id, name').eq('is_active', true),
      supabase.from('stores').select('id, name, code').eq('is_active', true),
      supabase.from('items').select('id, code, name, unit_of_measure').eq('is_active', true)
    ]);

    setSuppliers(suppliersRes.data || []);
    setStores(storesRes.data || []);
    setItems(itemsRes.data || []);
  };

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, purchase_order_items(item_id, quantity)')
      .eq('supplier_id', formData.supplier_id)
      .eq('status', 'pending')
      .eq('is_active', true);
    setPurchaseOrders(data || []);
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { item_id: '', batch_no: '', batch_expiry: '', received_qty: 0, cost_price: 0, discount_percent: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const calculateNetValue = (item: GRNItem) => {
    const lineTotal = item.received_qty * item.cost_price;
    const discount = lineTotal * (item.discount_percent / 100);
    return lineTotal - discount;
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.received_qty * item.cost_price), 0);
    const totalDiscount = lineItems.reduce((sum, item) => {
      const lineTotal = item.received_qty * item.cost_price;
      return sum + (lineTotal * item.discount_percent / 100);
    }, 0);
    return {
      subtotal,
      totalDiscount,
      totalAmount: subtotal - totalDiscount
    };
  };

  const handleSubmit = async (e: React.FormEvent, draft = false) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.store_id || lineItems.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (lineItems.some(item => !item.item_id || item.received_qty === 0)) {
      alert('Please fill all item details');
      return;
    }

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();

      const res = await fetch('/api/purchase-grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: lineItems,
          user_id: session?.session?.user?.id
        })
      });

      const result = await res.json();

      if (result.success) {
        alert(result.message);
        router.push(`/purchase/grn/${result.data.id}`);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Error creating GRN: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New GRN</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded p-6 space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Supplier *</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Store *</label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">Select Store</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">PO Reference</label>
            <select
              value={formData.po_reference_id}
              onChange={(e) => setFormData({ ...formData, po_reference_id: e.target.value })}
              className="w-full border p-2 rounded"
            >
              <option value="">No PO</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>{po.po_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Invoice #</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Supplier's invoice number"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Invoice Date</label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border p-2 rounded"
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left">Batch No</th>
                  <th className="px-4 py-2 text-left">Expiry</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Cost Price</th>
                  <th className="px-4 py-2 text-right">Discount %</th>
                  <th className="px-4 py-2 text-right">Net Value</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">
                      <select
                        value={item.item_id}
                        onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                        required
                        className="w-full border p-1 rounded text-xs"
                      >
                        <option value="">Select Item</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(idx, 'batch_no', e.target.value)}
                        className="w-full border p-1 rounded text-xs"
                        placeholder="Batch"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={item.batch_expiry}
                        onChange={(e) => handleItemChange(idx, 'batch_expiry', e.target.value)}
                        className="w-full border p-1 rounded text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(idx, 'received_qty', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.cost_price}
                        onChange={(e) => handleItemChange(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => handleItemChange(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="w-full border p-1 rounded text-xs text-right"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      Rs. {calculateNetValue(item).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-600 hover:underline text-xs"
                      >Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-50 p-4 rounded flex justify-end">
          <div className="w-80">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>Rs. {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2 text-yellow-600">
              <span>Total Discount:</span>
              <span>- Rs. {totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>Rs. {totals.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create GRN'}
          </button>
        </div>
      </form>
    </div>
  );
}
