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
        setStores(result.stores);
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
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Stores</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-xs font-semibold hover:bg-blue-700 transition"
        >
          + Add Store
        </button>
      </div>

      <div className="mb-3">
        <input
          type="text"
          placeholder="Search stores by code, name, or email..."
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
      ) : stores.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          No stores found. Create one to get started!
        </div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Address</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Email</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{store.code}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{store.name}</td>
                  <td className="px-3 py-2 text-gray-600">{store.address || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{store.phone || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{store.email || '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(store)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(store.id)}
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
              {editingId ? 'Edit Store' : 'Create Store'}
            </h2>

            {error && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-xs mb-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Code * (e.g., STR001)
                </label>
                <input
                  {...register('code')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store code"
                />
                {errors.code && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Name *</label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Address</label>
                <input
                  {...register('address')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Store address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Phone</label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>
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
            <h2 className="text-lg font-bold mb-2">Delete Store?</h2>
            <p className="text-gray-600 mb-4 text-xs">
              Are you sure you want to delete this store? This action cannot be undone.
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