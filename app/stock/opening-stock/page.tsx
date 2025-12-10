'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
}

interface OpeningStockEntry {
  id: string;
  ref_number: string;
  entry_date: string;
  store_id: string;
  supplier_id: string | null;
  total_value: number;
  total_discount: number;
  net_total: number;
  created_at: string;
}

export default function OpeningStockPage() {
  const [entries, setEntries] = useState<OpeningStockEntry[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      entry_date: new Date().toISOString().split('T')[0],
      store_id: '',
      supplier_id: '',
      description: '',
      items: [{ item_id: '', batch_no: '', batch_expiry: '', quantity: 0, cost_price: 0, discount_percent: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');

  // Calculate totals
  const calculateTotals = () => {
    let totalValue = 0;
    let totalDiscount = 0;

    watchItems.forEach((item) => {
      const lineTotal = (item.cost_price || 0) * (item.quantity || 0);
      const discountValue = item.discount_percent ? (lineTotal * item.discount_percent) / 100 : 0;
      totalValue += lineTotal;
      totalDiscount += discountValue;
    });

    return { totalValue, totalDiscount, netTotal: totalValue - totalDiscount };
  };

  const totals = calculateTotals();

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const result = await response.json();
      if (result.success) {
        setStores(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch stores');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch items');
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      if (filterStore) query.append('store_id', filterStore);

      const response = await fetch(`/api/opening-stock?${query.toString()}`);
      const result = await response.json();

      if (result.success) {
        setEntries(result.data);
      } else {
        setError(result.error || 'Failed to fetch entries');
      }
    } catch (err) {
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchItems();
    fetchEntries();
  }, [searchTerm, filterStore]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/opening-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setIsCreateMode(false);
        reset();
        fetchEntries();
      } else {
        setError(result.error || 'Failed to create opening stock entry');
      }
    } catch (err) {
      setError('Failed to create opening stock entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCreateMode) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => setIsCreateMode(false)}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to List
          </button>
          <h1 className="text-3xl font-bold">Create Opening Stock Entry</h1>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-lg shadow max-w-6xl">
          {/* Header Section */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date *</label>
              <input
                {...register('entry_date')}
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
              <select
                {...register('store_id')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (Optional)</label>
              <input
                {...register('supplier_id')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Supplier name"
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entry description"
            />
          </div>

          {/* Line Items Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Items</h2>
              <button
                type="button"
                onClick={() =>
                  append({
                    item_id: '',
                    batch_no: '',
                    batch_expiry: '',
                    quantity: 0,
                    cost_price: 0,
                    discount_percent: 0,
                  })
                }
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Item</th>
                    <th className="border p-2">Batch No</th>
                    <th className="border p-2">Expiry</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">Cost Price</th>
                    <th className="border p-2">Discount %</th>
                    <th className="border p-2">Net Value</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const item = watchItems[idx];
                    const lineTotal = (item?.cost_price || 0) * (item?.quantity || 0);
                    const discountValue = item?.discount_percent ? (lineTotal * item.discount_percent) / 100 : 0;
                    const netValue = lineTotal - discountValue;

                    return (
                      <tr key={field.id} className="border">
                        <td className="border p-2">
                          <select
                            {...register(`items.${idx}.item_id`)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="">Select Item</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.code} - {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.batch_no`)}
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            placeholder="Batch"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.batch_expiry`)}
                            type="date"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.cost_price`, { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.discount_percent`, { valueAsNumber: true })}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="border p-2 text-right">
                          Rs. {netValue.toFixed(2)}
                        </td>
                        <td className="border p-2">
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="text-red-600 hover:text-red-800"
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
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
            <div>
              <p className="text-gray-600 text-sm">Total Value</p>
              <p className="text-2xl font-bold">Rs. {totals.totalValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Discount</p>
              <p className="text-2xl font-bold">Rs. {totals.totalDiscount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Net Total</p>
              <p className="text-2xl font-bold text-blue-600">Rs. {totals.netTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsCreateMode(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Opening Stock'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Opening Stock Entries</h1>
        <button
          onClick={() => setIsCreateMode(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by ref number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Stores</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No opening stock entries found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Ref Number</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Entry Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Store</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Total Value</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Net Total</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.ref_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(entry.entry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {stores.find((s) => s.id === entry.store_id)?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    Rs. {entry.total_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-blue-600">
                    Rs. {entry.net_total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/app/stock/opening-stock/${entry.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
