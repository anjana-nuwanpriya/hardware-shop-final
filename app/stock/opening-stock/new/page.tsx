/**
 * Page Component: /app/stock/opening-stock/new/page.tsx
 * Create New Opening Stock Entry
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Supplier {
  id: string;
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

interface OpeningStockItem {
  id: string;
  item_id: string;
  item?: Item;
  batch_no?: string;
  batch_expiry?: string;
  quantity: number;
  cost_price: number;
  discount_percent: number;
  discount_value: number;
  net_value: number;
  isEditing?: boolean;
}

interface FormData {
  store_id: string;
  supplier_id: string;
  description: string;
  items: OpeningStockItem[];
}

export default function NewOpeningStockPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState<FormData>({
    store_id: '',
    supplier_id: '',
    description: '',
    items: [],
  });

  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStoresAndSuppliers();
  }, []);

  const fetchStoresAndSuppliers = async () => {
    try {
      const [storesRes, suppliersRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/suppliers'),
      ]);

      const storesData = await storesRes.json();
      const suppliersData = await suppliersRes.json();

      if (storesData.success) setStores(storesData.data || []);
      if (suppliersData.success) setSuppliers(suppliersData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load stores and suppliers');
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
        // Filter out already added items
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
    const newItem: OpeningStockItem = {
      id: Math.random().toString(),
      item_id: item.id,
      item,
      batch_no: '',
      batch_expiry: '',
      quantity: 1,
      cost_price: item.cost_price,
      discount_percent: 0,
      discount_value: 0,
      net_value: item.cost_price,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateItem = (id: string, updates: Partial<OpeningStockItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };

          // Recalculate net_value
          const lineTotal = updated.cost_price * updated.quantity;
          const discountValue =
            updated.discount_percent > 0
              ? (lineTotal * updated.discount_percent) / 100
              : updated.discount_value;
          updated.discount_value = discountValue;
          updated.net_value = lineTotal - discountValue;

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

  const updateItemPrice = async (itemId: string, costPrice: number) => {
    try {
      const response = await fetch(`/api/items/${itemId}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost_price: costPrice }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Item price updated in database');
        setTimeout(() => setSuccessMessage(''), 3000);

        // Update all items with this item_id in the form
        setFormData((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.item_id === itemId
              ? { ...item, cost_price: costPrice }
              : item
          ),
        }));
      }
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update item price');
    }
  };

  const calculateTotals = () => {
    const totalValue = formData.items.reduce(
      (sum, item) => sum + item.cost_price * item.quantity,
      0
    );
    const totalDiscount = formData.items.reduce(
      (sum, item) => sum + item.discount_value,
      0
    );
    const netTotal = totalValue - totalDiscount;

    return { totalValue, totalDiscount, netTotal };
  };

  const { totalValue, totalDiscount, netTotal } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!formData.store_id) {
      setError('Please select a store');
      return;
    }

    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    // Check for items without batch numbers
    const itemsWithoutBatch = formData.items.filter((item) => !item.batch_no);
    if (itemsWithoutBatch.length > 0) {
      const confirmContinue = window.confirm(
        `${itemsWithoutBatch.length} item(s) don't have batch numbers. Continue anyway?`
      );
      if (!confirmContinue) return;
    }

    try {
      setSubmitting(true);

      const payload = {
        store_id: formData.store_id,
        supplier_id: formData.supplier_id || null,
        description: formData.description || null,
        items: formData.items.map((item) => ({
          item_id: item.item_id,
          batch_no: item.batch_no || null,
          batch_expiry: item.batch_expiry || null,
          quantity: item.quantity,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent,
          discount_value: item.discount_value,
        })),
      };

      const response = await fetch('/api/opening-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Opening stock entry created successfully!');
        setTimeout(() => {
          router.push(`/stock/opening-stock/${data.data.id}`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to create opening stock entry');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while creating the entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Opening Stock</h1>
          <p className="mt-2 text-gray-600">Add initial inventory for your store</p>
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
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store *
                </label>
                <select
                  value={formData.store_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      store_id: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a store...</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} - {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier (Optional)
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplier_id: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
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
              <h2 className="text-xl font-bold text-gray-900">Items</h2>
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Cost Price
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Discount %
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Net Value
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div className="font-semibold text-gray-900">
                                {item.item?.code}
                              </div>
                              <div className="text-gray-600">{item.item?.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.batch_no || ''}
                              onChange={(e) =>
                                updateItem(item.id, { batch_no: e.target.value })
                              }
                              placeholder="Batch No."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {!item.batch_no && (
                              <p className="text-xs text-yellow-600 mt-1">⚠ No batch</p>
                            )}
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
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              min="0"
                              step="0.01"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={item.cost_price}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    cost_price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                min="0"
                                step="0.01"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemPrice(
                                    item.item_id,
                                    item.cost_price
                                  )
                                }
                                title="Update item price in database"
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Save
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.discount_percent}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  discount_percent: parseFloat(e.target.value) || 0,
                                })
                              }
                              min="0"
                              max="100"
                              step="0.01"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            %
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {item.net_value.toFixed(2)}
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
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 border-t pt-4 space-y-2 text-right">
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-semibold w-24">{totalValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-semibold w-24 text-red-600">
                      -{totalDiscount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-4 text-lg">
                    <span className="text-gray-900 font-bold">Net Total:</span>
                    <span className="font-bold w-24 text-blue-600">
                      {netTotal.toFixed(2)}
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
              {submitting ? 'Creating...' : 'Create Opening Stock'}
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
                  Select Items
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
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                      >
                        <div
                          onClick={() => addItem(item)}
                          className="flex justify-between items-start"
                        >
                          <div>
                            <div className="font-semibold text-gray-900">
                              {item.code} - {item.name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Cost: {item.cost_price} | Retail:{' '}
                              {item.retail_price} | Wholesale:{' '}
                              {item.wholesale_price}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(item);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
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