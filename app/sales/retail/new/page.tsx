'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  code: string;
  name: string;
  retail_price: number;
}

interface ItemStoreStock {
  id: string;
  item_id: string;
  store_id: string;
  quantity_on_hand: number;
  items: Item | null;
}

interface LineItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_value: number;
  available_qty: number;
  batch_no: string;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  type: string;
}

export default function NewSaleRetailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [storeItems, setStoreItems] = useState<ItemStoreStock[]>([]);

  // Search
  const [itemSearch, setItemSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState<ItemStoreStock[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string>('');
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);

  // Form
  const [formData, setFormData] = useState({
    store_id: '',
    customer_id: '',
    employee_id: '',
    payment_method: 'cash',
    description: '',
    items: [
      {
        id: '0',
        item_id: '',
        item_code: '',
        item_name: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_value: 0,
        available_qty: 0,
        batch_no: '',
      } as LineItem,
    ],
  });

  // Fetch initial data
  useEffect(() => {
    console.log('Component mounted, fetching stores and customers...');
    fetchStores();
    fetchCustomers();
  }, []);

  // Fetch items when store changes
  useEffect(() => {
    if (formData.store_id) {
      console.log('Store changed to:', formData.store_id);
      fetchStoreItems();
    } else {
      setStoreItems([]);
      setFilteredItems([]);
    }
  }, [formData.store_id]);

  // Filter items on search
  useEffect(() => {
    console.log('Filtering items. Search:', itemSearch, 'Total items:', storeItems.length);
    
    if (!formData.store_id) {
      setFilteredItems([]);
      return;
    }

    if (itemSearch.trim() === '') {
      const first10 = storeItems.slice(0, 10);
      console.log('No search, showing first 10 items:', first10);
      setFilteredItems(first10);
    } else {
      const searchLower = itemSearch.toLowerCase();
      const filtered = storeItems.filter((si) => {
        const item = si.items;
        if (!item) return false;
        const matches =
          (item.name && item.name.toLowerCase().includes(searchLower)) ||
          (item.code && item.code.toLowerCase().includes(searchLower));
        return matches;
      });
      console.log('Search results for "' + itemSearch + '":', filtered);
      setFilteredItems(filtered.slice(0, 10));
    }
  }, [itemSearch, formData.store_id, storeItems]);

  const fetchStores = async () => {
    try {
      console.log('Fetching stores from /api/stores...');
      const res = await fetch('/api/stores');
      
      if (!res.ok) {
        throw new Error(`Stores API error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ Stores response:', data);
      
      if (data.data && Array.isArray(data.data)) {
        setStores(data.data);
      } else {
        console.warn('Invalid stores data format:', data);
      }
    } catch (err) {
      console.error('❌ Error fetching stores:', err);
      setError('Failed to load stores');
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers from /api/customers...');
      const res = await fetch('/api/customers');
      
      if (!res.ok) {
        throw new Error(`Customers API error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ Customers response:', data);
      
      if (data.data && Array.isArray(data.data)) {
        setCustomers(data.data);
      } else {
        console.warn('Invalid customers data format:', data);
      }
    } catch (err) {
      console.error('❌ Error fetching customers:', err);
    }
  };

  const fetchStoreItems = async () => {
    try {
      console.log('Fetching items for store:', formData.store_id);
      const url = `/api/item-store-stock?store_id=${formData.store_id}`;
      console.log('API URL:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Item stock API error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ Item stock response:', data);
      
      if (data.data && Array.isArray(data.data)) {
        const filtered = data.data.filter((item: ItemStoreStock) => item.quantity_on_hand > 0);
        console.log('Filtered items (qty > 0):', filtered);
        setStoreItems(filtered);
      } else {
        console.warn('Invalid item data format:', data);
        setStoreItems([]);
      }
    } catch (err) {
      console.error('❌ Error fetching store items:', err);
      setError('Failed to fetch items for selected store');
      setStoreItems([]);
    }
  };

  const handleSelectItem = (storeItem: ItemStoreStock) => {
    if (selectedItemIndex >= 0) {
      const item = storeItem.items;
      const newItems = [...formData.items];
      const discountValue =
        newItems[selectedItemIndex].unit_price *
        newItems[selectedItemIndex].quantity *
        (newItems[selectedItemIndex].discount_percent / 100);

      newItems[selectedItemIndex] = {
        ...newItems[selectedItemIndex],
        item_id: storeItem.item_id,
        item_code: item?.code || '',
        item_name: item?.name || '',
        unit_price: item?.retail_price || 0,
        available_qty: storeItem.quantity_on_hand,
        discount_value: discountValue,
      };
      setFormData({ ...formData, items: newItems });
    }
    setItemSearch('');
    setFilteredItems([]);
    setOpenDropdown('');
    setError('');
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
          quantity: 1,
          unit_price: 0,
          discount_percent: 0,
          discount_value: 0,
          available_qty: 0,
          batch_no: '',
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

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const newItems = [...formData.items];
    const item = newItems[index];

    if (field === 'quantity') {
      const numValue = typeof value === 'string' ? parseInt(value) || 1 : value;
      if (numValue > item.available_qty) {
        setError(
          `Cannot exceed available stock of ${item.available_qty} units for ${item.item_name}`
        );
        return;
      }
      item.quantity = Math.max(1, numValue);
      item.discount_value =
        item.unit_price * item.quantity * (item.discount_percent / 100);
    } else if (field === 'discount_percent') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      item.discount_percent = numValue;
      item.discount_value =
        item.unit_price * item.quantity * (item.discount_percent / 100);
    } else if (field === 'discount_value') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      item.discount_value = numValue;
    } else if (field === 'unit_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      item.unit_price = numValue;
      item.discount_value =
        item.unit_price * item.quantity * (item.discount_percent / 100);
    } else {
      (item[field] as unknown) = value;
    }

    setFormData({ ...formData, items: newItems });
    setError('');
  };

  const openItemSearch = (index: number) => {
    if (!formData.store_id) {
      setError('Please select a store first');
      return;
    }
    setSelectedItemIndex(index);
    setOpenDropdown(String(index));
    setItemSearch('');
  };

  const calculateLineTotal = (item: LineItem) => {
    const subtotal = item.unit_price * item.quantity;
    const discountValue = item.discount_value || 0;
    return subtotal - discountValue;
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + calculateLineTotal(item), 0);
  };

  const validateForm = () => {
    if (!formData.store_id) {
      setError('Select a store');
      return false;
    }

    if (formData.items.length === 0) {
      setError('Add at least one item');
      return false;
    }

    for (const item of formData.items) {
      if (!item.item_id) {
        setError('All items must be selected');
        return false;
      }
      if (item.quantity <= 0) {
        setError('All items must have quantity > 0');
        return false;
      }
      if (item.unit_price <= 0) {
        setError('All items must have price > 0');
        return false;
      }
      if (item.quantity > item.available_qty) {
        setError(`${item.item_name}: Insufficient stock`);
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

      const res = await fetch('/api/sales-retail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id || null,
          store_id: formData.store_id,
          employee_id: formData.employee_id || null,
          payment_method: formData.payment_method,
          description: formData.description || null,
          items: formData.items.map((item) => ({
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            discount_value: item.discount_value,
            batch_no: item.batch_no || null,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create sale');
      }

      const result = await res.json();
      router.push(`/sales/retail?success=${result.data.invoice_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
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
        <Link
          href="/sales/retail"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Retail Sales
        </Link>
        <h1 className="text-3xl font-bold mt-2">New Retail Sale</h1>
        <p className="text-gray-600 text-sm mt-1">
          Create a new point-of-sale (POS) transaction
        </p>
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
        {/* Store & Customer Info */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
            <select
              value={formData.store_id}
              onChange={(e) => {
                console.log('Store selected:', e.target.value);
                setFormData({ ...formData, store_id: e.target.value });
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {stores.length === 0 ? 'Loading stores...' : 'Select Store'}
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {stores.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">No stores loaded</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer (Optional)
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="check">Check</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Items Section */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Sale Items</h2>
              {storeItems.length > 0 && (
                <p className="text-xs text-gray-500">
                  {storeItems.length} items available in selected store
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-medium"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={item.id} className="border rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-7 gap-2 items-end">
                  {/* Item Selection */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product *
                      {item.available_qty > 0 && (
                        <span className="text-green-600 ml-1">({item.available_qty} in stock)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={item.item_name || item.item_code || ''}
                        readOnly
                        onClick={() => openItemSearch(index)}
                        placeholder="Click to search..."
                        className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 cursor-pointer ${
                          !item.item_id
                            ? 'border-red-300 bg-red-50 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {item.item_id && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-lg">
                          ✓
                        </div>
                      )}

                      {/* Dropdown */}
                      {openDropdown === String(index) && formData.store_id && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                          <input
                            type="text"
                            placeholder="Search items..."
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            className="w-full px-3 py-2 border-b text-sm focus:outline-none"
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto">
                            {filteredItems.length > 0 ? (
                              filteredItems.map((si) => {
                                const itemData = si.items;
                                if (!itemData) return null;
                                return (
                                  <div
                                    key={si.id}
                                    onClick={() => handleSelectItem(si)}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b text-sm"
                                  >
                                    <div className="font-medium">{itemData.name}</div>
                                    <div className="text-xs text-gray-600 flex justify-between mt-0.5">
                                      <span>{itemData.code}</span>
                                      <span>
                                        Stock:{' '}
                                        <span className="font-semibold text-green-600">
                                          {si.quantity_on_hand}
                                        </span>{' '}
                                        | Price:{' '}
                                        <span className="font-semibold">
                                          Rs. {itemData.retail_price}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : itemSearch.length > 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-600">
                                No items found matching "{itemSearch}"
                              </div>
                            ) : (
                              <div className="px-3 py-2 text-xs text-gray-600">
                                {storeItems.length === 0
                                  ? 'No items available in this store'
                                  : 'Type to search items...'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Qty *</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="1"
                      required
                      className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                        item.quantity <= 0
                          ? 'border-red-300 bg-red-50 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      step="0.01"
                      required
                      className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                        item.unit_price <= 0
                          ? 'border-red-300 bg-red-50 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  {/* Discount % */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      value={item.discount_percent}
                      onChange={(e) =>
                        handleItemChange(index, 'discount_percent', e.target.value)
                      }
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={formData.items.length === 1}
                    className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>

                {/* Line Total */}
                <div className="mt-3 flex justify-end">
                  <div className="text-right">
                    <span className="text-xs text-gray-600 mr-2">Line Total:</span>
                    <span className="font-semibold text-gray-900">
                      Rs.{' '}
                      {calculateLineTotal(item).toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Section */}
        <div className="border-t pt-6 bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Subtotal</p>
              <p className="text-xl font-semibold text-gray-900">
                Rs.{' '}
                {formData.items
                  .reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
                  .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Discount</p>
              <p className="text-xl font-semibold text-orange-600">
                -Rs.{' '}
                {formData.items
                  .reduce((sum, item) => sum + item.discount_value, 0)
                  .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">
                Rs. {total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end border-t pt-6">
          <Link
            href="/sales/retail"
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || formData.items.length === 0}
            className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating Sale...' : 'Create Sale'}
          </button>
        </div>
      </form>
    </div>
  );
}