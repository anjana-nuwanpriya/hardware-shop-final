'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  unit_of_measure: string;
}

interface StockItem {
  item_id: string;
  quantity_on_hand: number;
}

interface DispatchItem {
  id: string;
  item_id: string;
  item?: Item;
  batch_no?: string;
  batch_expiry?: string;
  quantity: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  unit_of_measure: string;
  dispatch_value: number;
}

interface FormData {
  from_store_id: string;
  to_store_id: string;
  description: string;
  items: DispatchItem[];
}

export default function NewDispatchPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [formData, setFormData] = useState<FormData>({
    from_store_id: '',
    to_store_id: '',
    description: '',
    items: [],
  });

  const [storeStock, setStoreStock] = useState<Record<string, number>>({});
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError('Failed to load stores');
    }
  };

  const fetchStoreStock = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stock/by-store?store_id=${storeId}`);
      const data = await response.json();
      if (data.success && data.data) {
        const stockMap: Record<string, number> = {};
        data.data.forEach((item: any) => {
          stockMap[item.item_id] = item.quantity_on_hand;
        });
        setStoreStock(stockMap);
      }
    } catch (error) {
      console.error('Error fetching store stock:', error);
    }
  };

  const searchItems = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/opening-stock/items/search?q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        const existingItemIds = new Set(formData.items.map((item) => item.item_id));
        setSearchResults(
          (data.data || []).filter((item: Item) => !existingItemIds.has(item.id))
        );
      }
    } catch (error) {
      console.error('Error searching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchItems(value);
  };

  const addItem = (item: Item) => {
    const availableQty = storeStock[item.id] || 0;

    if (availableQty <= 0) {
      setError(`Item "${item.name}" not available in source store`);
      return;
    }

    const newItem: DispatchItem = {
      id: Math.random().toString(),
      item_id: item.id,
      item,
      batch_no: '',
      batch_expiry: '',
      quantity: 1,
      cost_price: item.cost_price,
      retail_price: item.retail_price,
      wholesale_price: item.wholesale_price,
      unit_of_measure: item.unit_of_measure,
      dispatch_value: item.cost_price,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  const updateItem = (id: string, updates: Partial<DispatchItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.dispatch_value = updated.quantity * updated.cost_price;
          return updated;
        }
        return item;
      }),
    }));
  };

  const removeItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const calculateTotals = () => {
    const totalItems = formData.items.length;
    const totalQuantity = formData.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalValue = formData.items.reduce(
      (sum, item) => sum + item.dispatch_value,
      0
    );

    return { totalItems, totalQuantity, totalValue };
  };

  const { totalItems, totalQuantity, totalValue } = calculateTotals();

  const getAvailableQty = (itemId: string) => {
    const dispatchedQty = formData.items
      .filter((item) => item.item_id === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
    const availableQty = storeStock[itemId] || 0;
    return availableQty - dispatchedQty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!formData.from_store_id) {
      setError('Please select source store');
      return;
    }

    if (!formData.to_store_id) {
      setError('Please select destination store');
      return;
    }

    if (formData.from_store_id === formData.to_store_id) {
      setError('Source and destination stores must be different');
      return;
    }

    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    // Validate quantities
    for (const item of formData.items) {
      if (item.quantity <= 0) {
        setError(`Item "${item.item?.name}" must have quantity > 0`);
        return;
      }

      if (item.quantity > (storeStock[item.item_id] || 0)) {
        setError(
          `Item "${item.item?.name}" exceeds available stock (${storeStock[item.item_id] || 0})`
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        from_store_id: formData.from_store_id,
        to_store_id: formData.to_store_id,
        description: formData.description || null,
        items: formData.items.map((item) => ({
          item_id: item.item_id,
          quantity: item.quantity,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          cost_price: item.cost_price,
          retail_price: item.retail_price,
          wholesale_price: item.wholesale_price,
          unit_of_measure: item.unit_of_measure,
        })),
      };

      const response = await fetch('/api/item-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Dispatch created successfully!');
        setTimeout(() => {
          router.push(`/stock/dispatch/${data.data.id}`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to create dispatch');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while creating the dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const fromStoreName = stores.find((s) => s.id === formData.from_store_id)?.name;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Dispatch</h1>
          <p className="mt-2 text-gray-600">Transfer stock between stores</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Stores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Store (Source) *
                </label>
                <select
                  value={formData.from_store_id}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      from_store_id: e.target.value,
                    }));
                    fetchStoreStock(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select source store...</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} - {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Store (Destination) *
                </label>
                <select
                  value={formData.to_store_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      to_store_id: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select destination store...</option>
                  {stores
                    .filter((s) => s.id !== formData.from_store_id)
                    .map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.code} - {store.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Enter any notes or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Items</h2>
              <button
                type="button"
                onClick={() => formData.from_store_id && setShowSearchModal(true)}
                disabled={!formData.from_store_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Items
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet. Click "Add Items" to get started.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Item Code / Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Batch No.
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Expiry
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Available
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Cost Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Value
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item) => {
                        const available = getAvailableQty(item.item_id);
                        return (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div className="font-semibold text-gray-900">
                                  {item.item?.code}
                                </div>
                                <div className="text-gray-600">
                                  {item.item?.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.batch_no || ''}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    batch_no: e.target.value,
                                  })
                                }
                                placeholder="Batch No."
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={item.batch_expiry || ''}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    batch_expiry: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-semibold ${
                                  available < item.quantity
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}
                              >
                                {available}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    quantity:
                                      parseFloat(e.target.value) || 0,
                                  })
                                }
                                min="0"
                                max={storeStock[item.item_id] || 0}
                                step="1"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              LKR {item.cost_price.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              LKR {item.dispatch_value.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 border-t pt-4 space-y-2 text-right">
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold w-24">{totalItems}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-600">Total Qty:</span>
                    <span className="font-semibold w-24">
                      {totalQuantity.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-end gap-4 text-lg">
                    <span className="text-gray-900 font-bold">
                      Total Value:
                    </span>
                    <span className="font-bold w-24 text-blue-600">
                      LKR {totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || formData.items.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Dispatch'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Select Items from {fromStoreName}
                </h3>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name, code, or barcode..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : searchQuery.length < 2 ? (
                  <div className="p-8 text-center text-gray-500">
                    Start typing to search items...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No items found
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map((item) => {
                      const availableQty = storeStock[item.id] || 0;
                      const canAdd = availableQty > 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 ${
                            canAdd
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'bg-gray-50 opacity-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {item.code} - {item.name}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Available: {availableQty} | Cost:{' '}
                                {item.cost_price} | Retail:{' '}
                                {item.retail_price}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canAdd) addItem(item);
                              }}
                              disabled={!canAdd}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {canAdd ? 'Add' : 'N/A'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}