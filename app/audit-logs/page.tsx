'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  user_id?: string;
  created_at: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ table?: string; action?: string; days?: number }>({
    days: 7,
  });

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.table) params.append('table_name', filter.table);
      if (filter.action) params.append('action', filter.action);
      if (filter.days) params.append('days', String(filter.days));
      params.append('limit', '200');

      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const actionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      REVERSAL: 'bg-orange-100 text-orange-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading audit logs...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">📋 Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg mb-6 flex gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Days</label>
          <select
            value={filter.days || 7}
            onChange={(e) => setFilter({ ...filter, days: parseInt(e.target.value) })}
            className="border px-3 py-1 rounded"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Action</label>
          <select
            value={filter.action || ''}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="border px-3 py-1 rounded"
          >
            <option value="">All</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="REVERSAL">Reversal</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Timestamp</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Table</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Record ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">User</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{log.table_name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {log.record_id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm">{log.user_id || 'System'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-600 mt-4">
        Showing {logs.length} records from last {filter.days} days
      </p>
    </div>
  );
}
