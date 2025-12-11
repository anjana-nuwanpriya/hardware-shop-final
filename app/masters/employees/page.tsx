'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmployeeSchema, type EmployeeInput } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';

interface Store {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  employee_code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  role: string;
  store_id: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLES = ['admin', 'manager', 'cashier', 'staff'] as const;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
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
  } = useForm<EmployeeInput>({
    resolver: zodResolver(EmployeeSchema),
  });

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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      if (filterRole) query.append('role', filterRole);

      const response = await fetch(`/api/employees?${query.toString()}`);
      const result = await response.json();

      if (result.success) {
        setEmployees(result.data);
      } else {
        setError(result.error || 'Failed to fetch employees');
      }
    } catch (err) {
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchEmployees();
  }, [searchTerm, filterRole]);

  const onSubmit = async (data: EmployeeInput) => {
    try {
      setIsSubmitting(true);
      setError('');

      const url = editingId ? `/api/employees/${editingId}` : '/api/employees';
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
        fetchEmployees();
      } else {
        setError(result.error || 'Failed to save employee');
      }
    } catch (err) {
      setError('Failed to save employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirm(null);
        fetchEmployees();
      } else {
        setError('Failed to delete employee');
      }
    } catch (err) {
      setError('Failed to delete employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setValue('name', employee.name);
    setValue('employee_code', employee.employee_code);
    setValue('phone', employee.phone || '');
    setValue('email', employee.email || '');
    setValue('address', employee.address || '');
    setValue('role', employee.role as 'admin' | 'manager' | 'cashier' | 'staff' | null | undefined);
    setValue('store_id', employee.store_id || '');
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
        <h1 className="text-xl font-bold">Employees</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-1 rounded text-xs font-semibold hover:bg-blue-700 transition"
        >
          + Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <input
          type="text"
          placeholder="Search employees by name, code, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
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
      ) : employees.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          No employees found. Create one to get started!
        </div>
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Code</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Role</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Store</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{employee.employee_code}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{employee.name}</td>
                  <td className="px-3 py-2 text-gray-600">{employee.email || '-'}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {stores.find((s) => s.id === employee.store_id)?.name || 'All Stores'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(employee.id)}
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
          <div className="bg-white rounded shadow p-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-3">
              {editingId ? 'Edit Employee' : 'Create Employee'}
            </h2>

            {error && (
              <div className="p-2 bg-red-100 text-red-700 rounded text-xs mb-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Name *</label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Employee name"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Employee Code *</label>
                <input
                  {...register('employee_code')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., EMP001"
                />
                {errors.employee_code && (
                  <p className="text-red-500 text-xs mt-0.5">{errors.employee_code.message}</p>
                )}
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
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Address</label>
                <input
                  {...register('address')}
                  type="text"
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Role *</label>
                <select
                  {...register('role')}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Assigned Store (Optional)</label>
                <select
                  {...register('store_id')}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Stores (System Access)</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
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
            <h2 className="text-lg font-bold mb-2">Delete Employee?</h2>
            <p className="text-gray-600 mb-4 text-xs">
              Are you sure you want to delete this employee? This action cannot be undone.
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