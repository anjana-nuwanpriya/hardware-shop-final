'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ItemSchema, type ItemInput } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';

interface Category {
  id: string;
  name: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category_id: string | null;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  barcode: string | null;
  hsn_code: string | null;
  unit_of_measure: string;
  reorder_level: number;
  tax_method: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
}

const TAX_METHODS = ['exclusive', 'inclusive', 'none'];

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<ItemInput>({
    resolver: zodResolver(ItemSchema),
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      if (filterCategory) query.append('category_id', filterCategory);

      const response = await fetch(`/api/items?${query.toString()}`);
      const result = await response.json();

      if (result.success) {
        setItems(result.data);
      } else {
        setError(result.error || 'Failed to fetch items');
      }
    } catch (err) {
      setError('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, [searchTerm, filterCategory]);

  const onSubmit = async (data: ItemInput) => {
    try {
      setIsSubmitting(true);
      setError('');

      const url = editingId ? `/api/items/${editingId}` : '/api/items';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setIsModalOpen(false);
        setEditingId(null);
        reset();
        fetchItems();
      } else {
        setError(result.error || 'Failed to save item');
      }
    } catch (err) {
      setError('Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirm(null);
        fetchItems();
      } else {
        setError('Failed to delete item');
      }
    } catch (err) {
      setError('Failed to delete item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setValue('code', item.code);
    setValue('name', item.name);
    setValue('description', item.description || '');
    setValue('category_id', item.category_id || '');
    setValue('cost_price', item.cost_price);
    setValue('retail_price', item.retail_price);
    setValue('wholesale_price', item.wholesale_price);
    setValue('barcode', item.barcode || '');
    setValue('hsn_code', item.hsn_code || '');
    setValue('unit_of_measure', item.unit_of_measure);
    setValue('reorder_level', item.reorder_level);
    setValue('tax_method', item.tax_method);
    setValue('tax_rate', item.tax_rate);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Items/Products</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search items by code, name, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
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
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No items found. Create one to get started!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Retail</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Wholesale</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Tax</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {categories.find((c) => c.id === item.category_id)?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">Rs. {item.cost_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rs. {item.retail_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">Rs. {item.wholesale_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {item.tax_method} {item.tax_rate > 0 ? `${item.tax_rate}%` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Edit Item' : 'Create Item'}
            </h2>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    {...register('code')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Item code"
                  />
                  {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Item name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Item description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    {...register('category_id')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                  <input
                    {...register('unit_of_measure')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., piece"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
                  <input
                    {...register('cost_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price *</label>
                  <input
                    {...register('retail_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Price *</label>
                  <input
                    {...register('wholesale_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    {...register('barcode')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Barcode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    {...register('hsn_code')}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HSN code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input
                    {...register('reorder_level', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Method *</label>
                  <select
                    {...register('tax_method')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TAX_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    {...register('tax_rate', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Delete Item?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
