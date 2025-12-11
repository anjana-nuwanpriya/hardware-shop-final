'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CategorySchema, type CategoryInput } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
  } = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(`/api/categories${query}`);
      const result = await response.json();

      if (result.success) {
        setCategories(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [searchTerm]);

  const onSubmit = async (data: CategoryInput) => {
    try {
      setIsSubmitting(true);
      setError('');

      const url = editingId
        ? `/api/categories/${editingId}`
        : '/api/categories';
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
        fetchCategories();
      } else {
        setError(result.error || 'Failed to save category');
      }
    } catch (err) {
      setError('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirm(null);
        fetchCategories();
      } else {
        setError('Failed to delete category');
      }
    } catch (err) {
      setError('Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Categories</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-xs font-semibold hover:bg-blue-700 transition"
        >
          + Add Category
        </button>
      </div>

      <div className="mb-3">
        <input
          type="text"
          placeholder="Search categories by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded text-xs mb-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2 text-xs">Loading...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          No categories found. Create one to get started!
        </div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Name
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Description
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  Created
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {category.description || '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {new Date(category.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(category.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded shadow p-4 max-w-md w-full">
            <h2 className="text-lg font-bold mb-3">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            {error && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-xs mb-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category description"
                  rows={2}
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-0.5">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition text-xs font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded shadow p-4 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Delete Category?</h2>
            <p className="text-gray-600 mb-4 text-xs">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isSubmitting}
                className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isSubmitting}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition text-xs font-semibold"
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