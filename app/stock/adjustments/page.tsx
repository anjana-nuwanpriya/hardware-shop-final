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

interface ItemStock {
  item_id: string;
  quantity_on_hand: number;
}

const ADJUSTMENT_REASONS = [
  'damaged',
  'expired',
  'theft_loss',
  'audit_difference',
  'returned_to_supplier',
  'free_issue',
  'other',
];

const REASON_LABELS: Record<string, string> = {
  damaged: 'Physical Damage',
  expired: 'Expired',
  theft_loss: 'Missing/Theft',
  audit_difference: 'Stocktake Variance',
  returned_to_supplier: 'Returned to Supplier',
  free_issue: 'Promotional Giveaway',
  other: 'Other',
};

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemStocks, setItemStocks] = useState<Record<string, ItemStock>>({});
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
      adjustment_date: new Date().toISOString().split('T')[0],
      store_id: '',
      reason: '',
      items: [{ item_id: '', batch_no: '', current_stock: 0, adjustment_qty: 0, adjustment_reason: 'other', remarks: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchStoreId = watch('store_id');

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const result = await response.json();
      if (result.success) {
        setStores(result.stores);
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

  const fetchItemStocks = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stock/current?store_id=${storeId}`);
      const result = await response.json();
      if (result.success) {
        const stockMap: Record<string, ItemStock> = {};
        result.data.items.forEach((item: any) => {
          stockMap[item.item_id] = { item_id: item.item_id, quantity_on_hand: item.quantity_on_hand };
        });
        setItemStocks(stockMap);
      }
    } catch (err) {
      console.error('Failed to fetch item stocks');
    }
  };

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      if (filterStore) query.append('store_id', filterStore);

      const response = await fetch(`/api/stock-adjustments?${query.toString()}`);
      const result = await response.json();

      if (result.success) {
        setAdjustments(result.data);
      } else {
        setError(result.error || 'Failed to fetch adjustments');
      }
    } catch (err) {
      setError('Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchItems();
    fetchAdjustments();
  }, [searchTerm, filterStore]);

  useEffect(() => {
    if (watchStoreId) {
      fetchItemStocks(watchStoreId);
    }
  }, [watchStoreId]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setIsCreateMode(false);
        reset();
        fetchAdjustments();
      } else {
        setError(result.error || 'Failed to create adjustment');
      }
    } catch (err) {
      setError('Failed to create adjustment');
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
          <h1 className="text-3xl font-bold">Create Stock Adjustment</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Date *</label>
              <input
                {...register('adjustment_date')}
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
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              {...register('reason')}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe why adjustment is needed"
            />
          </div>

          {/* Line Items Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Items to Adjust</h2>
              <button
                type="button"
                onClick={() =>
                  append({
                    item_id: '',
                    batch_no: '',
                    current_stock: 0,
                    adjustment_qty: 0,
                    adjustment_reason: 'other',
                    remarks: '',
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
                    <th className="border p-2">Current Qty</th>
                    <th className="border p-2">Adjustment</th>
                    <th className="border p-2">Reason</th>
                    <th className="border p-2">Remarks</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const itemId = watch(`items.${idx}.item_id`);
                    const currentStock = itemStocks[itemId]?.quantity_on_hand || 0;

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
                        <td className="border p-2 text-center">
                          {itemId ? currentStock : 'N/A'}
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.adjustment_qty`, { valueAsNumber: true })}
                            type="number"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            placeholder="+ or -"
                          />
                        </td>
                        <td className="border p-2">
                          <select
                            {...register(`items.${idx}.adjustment_reason`)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          >
                            {ADJUSTMENT_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {REASON_LABELS[reason]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-2">
                          <input
                            {...register(`items.${idx}.remarks`)}
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            placeholder="Notes"
                          />
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
              {isSubmitting ? 'Creating...' : 'Create Adjustment'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Adjustments</h1>
        <button
          onClick={() => setIsCreateMode(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Create Adjustment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by adjustment number..."
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
      ) : adjustments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No adjustments found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Adjustment Number</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Store</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Reason</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj: any) => (
                <tr key={adj.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{adj.adjustment_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(adj.adjustment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {stores.find((s) => s.id === adj.store_id)?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{adj.reason}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/app/stock/adjustments/${adj.id}`}
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
