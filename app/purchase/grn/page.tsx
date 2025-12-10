'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface LineItem {
  id: string;
  item_id: string;
  item_name: string;
  batch_no: string;
  batch_expiry: string;
  received_qty: number;
  cost_price: number;
  discount_percent: number;
  net_value: number;
}

export default function GRNCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    supplier_id: '',
    store_id: '',
    po_reference_id: '',
    invoice_number: '',
    invoice_date: '',
    description: ''
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      item_id: '',
      item_name: '',
      batch_no: '',
      batch_expiry: '',
      received_qty: 0,
      cost_price: 0,
      discount_percent: 0,
      net_value: 0
    }
  ]);
  const [itemSearch, setItemSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string>('');

  useEffect(() => {
    fetchSuppliers();
    fetchStores();
    fetchItems();
  }, []);

  // Filter items based on search
  useEffect(() => {
    if (itemSearch.trim() === '') {
      setFilteredItems(items.slice(0, 10)); // Show first 10 items
    } else {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
          item.code.toLowerCase().includes(itemSearch.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [itemSearch, items]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
  };

  const fetchStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');
    setStores(data || []);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('id, code, name, cost_price, unit_of_measure')
      .eq('is_active', true)
      .order('name');
    setItems(data || []);
  };

  const calculateLineValues = (item: LineItem) => {
    const lineTotal = item.received_qty * item.cost_price;
    const discount = lineTotal * (item.discount_percent / 100);
    const net = lineTotal - discount;
    return { lineTotal, discount, net };
  };

  const handleLineItemChange = (id: string, field: string, value: any) => {
    const updated = lineItems.map((item) => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };

        // Recalculate net value if qty, cost, or discount changed
        if (['received_qty', 'cost_price', 'discount_percent'].includes(field)) {
          const { net } = calculateLineValues(newItem);
          newItem.net_value = net;
        }

        return newItem;
      }
      return item;
    });
    setLineItems(updated);
  };

  const addLineItem = () => {
    const newId = Math.random().toString();
    setLineItems([
      ...lineItems,
      {
        id: newId,
        item_id: '',
        item_name: '',
        batch_no: '',
        batch_expiry: '',
        received_qty: 0,
        cost_price: 0,
        discount_percent: 0,
        net_value: 0
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      alert('At least one item is required');
      return;
    }
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;

    lineItems.forEach((item) => {
      const lineTotal = item.received_qty * item.cost_price;
      const discount = lineTotal * (item.discount_percent / 100);
      subtotal += lineTotal;
      totalDiscount += discount;
    });

    return {
      subtotal,
      totalDiscount,
      total: subtotal - totalDiscount
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.supplier_id || !formData.store_id) {
      alert('Supplier and Store are required');
      return;
    }

    // Debug: Show item details
    console.log('Line Items:', lineItems);
    console.log('Validation check:');
    lineItems.forEach((item, idx) => {
      console.log(`Item ${idx + 1}:`, {
        item_id: item.item_id,
        item_name: item.item_name,
        received_qty: item.received_qty,
        cost_price: item.cost_price,
        isValid: item.item_id && item.received_qty > 0 && item.cost_price > 0
      });
    });

    if (lineItems.some((item) => !item.item_id || item.received_qty <= 0 || item.cost_price <= 0)) {
      alert('❌ All items must have:\n✓ Item selected\n✓ Qty > 0\n✓ Cost Price > 0\n\nCheck console for details');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        supplier_id: formData.supplier_id,
        store_id: formData.store_id,
        po_reference_id: formData.po_reference_id || null,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date || null,
        description: formData.description || null,
        items: lineItems.map((item) => ({
          item_id: item.item_id,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          received_qty: item.received_qty,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent || 0,
          ordered_qty: null
        }))
      };

      console.log('Creating GRN with payload:', payload);

      const response = await fetch('/api/purchase-grns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        alert(`✅ GRN ${result.data.grn_number} created successfully!`);
        router.push(`/purchase/grn/${result.data.id}`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create GRN</h1>

        <form onSubmit={handleSubmit}>
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">GRN Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) =>
                    setFormData({ ...formData, store_id: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Store</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice #
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Reference
                </label>
                <input
                  type="text"
                  value={formData.po_reference_id}
                  onChange={(e) =>
                    setFormData({ ...formData, po_reference_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., PO-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Line Items</h2>
              <button
                type="button"
                onClick={addLineItem}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Item</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Batch #</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Expiry</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Cost Price</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Discount %</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Net Value</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => {
                              setItemSearch(e.target.value);
                              setOpenDropdown(item.id);
                            }}
                            onFocus={() => {
                              setItemSearch('');
                              setOpenDropdown(item.id);
                            }}
                            className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              !item.item_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Search & select item..."
                          />
                          {/* Show status indicator */}
                          {item.item_id && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-lg">
                              ✓
                            </div>
                          )}
                          {openDropdown === item.id && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                              {filteredItems.length > 0 ? (
                                filteredItems.map((i) => (
                                  <div
                                    key={i.id}
                                    onClick={() => {
                                      // Atomic update - all data at once
                                      const updatedItems = lineItems.map((li) => {
                                        if (li.id === item.id) {
                                          const newQty = li.received_qty || 1;
                                          const newCost = i.cost_price || 0;
                                          return {
                                            ...li,
                                            item_id: i.id,
                                            item_name: `${i.code} - ${i.name}`,
                                            cost_price: newCost,
                                            net_value: newQty * newCost * (1 - (li.discount_percent / 100))
                                          };
                                        }
                                        return li;
                                      });
                                      setLineItems(updatedItems);
                                      setOpenDropdown('');
                                      setItemSearch('');
                                    }}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b"
                                  >
                                    <div className="font-medium">{i.name}</div>
                                    <div className="text-xs text-gray-600">
                                      {i.code} • LKR {i.cost_price}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">No items found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.batch_no}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'batch_no', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Batch"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={item.batch_expiry}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'batch_expiry', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.received_qty}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'received_qty', parseFloat(e.target.value) || 0)
                          }
                          className={`w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            item.received_qty <= 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.cost_price}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'cost_price', parseFloat(e.target.value) || 0)
                          }
                          className={`w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            item.cost_price <= 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          step="0.01"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.discount_percent}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'discount_percent', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {item.net_value.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                <p className="text-2xl font-bold text-gray-900">
                  LKR {totals.subtotal.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Discount</p>
                <p className="text-2xl font-bold text-red-600">
                  - LKR {totals.totalDiscount.toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-blue-900">
                  LKR {totals.total.toFixed(2)}
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {loading ? 'Creating...' : 'Create GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}