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

const ROLES = ['admin', 'manager', 'salesperson', 'cashier', 'accountant', 'warehouse'];

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
        setStores(result.data);
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
    setValue('role', employee.role);
    setValue('store_id', employee.store_id || '');
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
        <h1 className="text-3xl font-bold">Employees</h1>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search employees by name, code, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No employees found. Create one to get started!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Code</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Store</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{employee.employee_code}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{employee.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.email || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {employee.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {stores.find((s) => s.id === employee.store_id)?.name || 'All Stores'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(employee.id)}
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
          <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Employee' : 'Create Employee'}
            </h2>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Employee name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code *</label>
                <input
                  {...register('employee_code')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., EMP001"
                />
                {errors.employee_code && (
                  <p className="text-red-500 text-sm mt-1">{errors.employee_code.message}</p>
                )}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  {...register('address')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  {...register('role')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Store (Optional)</label>
                <select
                  {...register('store_id')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Stores (System Access)</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
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
            <h2 className="text-xl font-bold mb-4">Delete Employee?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this employee? This action cannot be undone.
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
