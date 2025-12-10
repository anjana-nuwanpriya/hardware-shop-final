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

  // Fetch categories
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

  // Initial load and search
  useEffect(() => {
    fetchCategories();
  }, [searchTerm]);

  // Handle create/update
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

  // Handle delete
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

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setIsModalOpen(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Category
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search categories by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No categories found. Create one to get started!
        </div>
      ) : (
        /* Categories table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {category.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(category.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(category.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category description"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
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

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Delete Category?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
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
