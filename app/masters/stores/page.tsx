'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StoreSchema, type StoreInput } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';

interface Store {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
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
  } = useForm<StoreInput>({
    resolver: zodResolver(StoreSchema),
  });

  const fetchStores = async () => {
    try {
      setLoading(true);
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(`/api/stores${query}`);
      const result = await response.json();

      if (result.success) {
        setStores(result.data);
      } else {
        setError(result.error || 'Failed to fetch stores');
      }
    } catch (err) {
      setError('Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [searchTerm]);

  const onSubmit = async (data: StoreInput) => {
    try {
      setIsSubmitting(true);
      setError('');

      const url = editingId ? `/api/stores/${editingId}` : '/api/stores';
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
        fetchStores();
      } else {
        setError(result.error || 'Failed to save store');
      }
    } catch (err) {
      setError('Failed to save store');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/stores/${id}`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirm(null);
        fetchStores();
      } else {
        setError('Failed to delete store');
      }
    } catch (err) {
      setError('Failed to delete store');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (store: Store) => {
    setEditingId(store.id);
    setValue('code', store.code);
    setValue('name', store.name);
    setValue('address', store.address || '');
    setValue('phone', store.phone || '');
    setValue('email', store.email || '');
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
        <h1 className="text-3xl font-bold">Stores</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Store
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search stores by code, name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : stores.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No stores found. Create one to get started!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Code</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Address</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{store.code}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{store.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{store.address || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{store.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{store.email || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(store)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(store.id)}
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
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Store' : 'Create Store'}
            </h2>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code * (e.g., STR001)
                </label>
                <input
                  {...register('code')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store code"
                />
                {errors.code && (
                  <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  {...register('address')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
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

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Delete Store?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this store? This action cannot be undone.
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
