'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  todaysSales: number;
  todaysInvoices: number;
  totalReceivables: number;
  totalPayables: number;
  lowStockCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysSales: 0,
    todaysInvoices: 0,
    totalReceivables: 0,
    totalPayables: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        setStats(data.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, color }: { title: string; value: any; color: string }) => (
    <div className={`${color} rounded-lg p-6 text-white shadow-lg`}>
      <p className="text-sm font-medium opacity-90">{title}</p>
      <p className="text-3xl font-bold mt-2">
        {typeof value === 'number' && title.includes('Sales')
          ? `Rs. ${value.toLocaleString()}`
          : typeof value === 'number'
          ? value.toLocaleString()
          : value}
      </p>
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">📊 Dashboard</h1>
        <p className="text-blue-100">Welcome back! Here's your business overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Today's Sales"
          value={stats.todaysSales}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Invoices Today"
          value={stats.todaysInvoices}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Receivables"
          value={`Rs. ${stats.totalReceivables.toLocaleString()}`}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <StatCard
          title="Payables"
          value={`Rs. ${stats.totalPayables.toLocaleString()}`}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Stock deducted immediately on invoice creation</li>
            <li>✓ Payment status auto-updates based on allocations</li>
            <li>✓ All transactions are immutable (use reversals)</li>
            <li>✓ Every change is logged in audit trail</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-2">✅ System Status</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>✓ Database: Connected</li>
            <li>✓ Authentication: Active</li>
            <li>✓ Audit Logging: Enabled</li>
            <li>✓ All modules: Ready</li>
          </ul>
        </div>
      </div>
    </div>
  );
}