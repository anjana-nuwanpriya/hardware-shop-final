'use client';

import { useState, useEffect } from 'react';

interface StockItem {
  item_code: string;
  item_name: string;
  category_name: string;
  quantity_on_hand: number;
  reorder_level: number;
  cost_price: number;
  valuation: number;
  status: string;
}

interface StockReport {
  store_name: string;
  totalItems: number;
  totalQuantity: number;
  totalValuation: number;
  items: StockItem[];
}

export default function StockReportPage() {
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchReport();
  }, [storeId, categoryFilter, statusFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/reports/stock?${params}`);
      const data = await res.json();
      setReport(data.data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      OK: 'bg-green-100 text-green-800',
      LOW: 'bg-yellow-100 text-yellow-800',
      CRITICAL: 'bg-red-100 text-red-800',
      OUT_OF_STOCK: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    if (!report?.items) return;

    let csv = 'Item Code,Item Name,Category,Qty,Reorder Level,Cost,Valuation,Status\n';
    report.items.forEach((item) => {
      csv += `${item.item_code},"${item.item_name}","${item.category_name}",${item.quantity_on_hand},${item.reorder_level},${item.cost_price},${item.valuation},"${item.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading report...</div>;
  }

  if (!report) {
    return <div className="p-8">No data found</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">📦 Stock Report</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="">All</option>
            <option value="OK">OK</option>
            <option value="LOW">Low</option>
            <option value="CRITICAL">Critical</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-blue-900">{report.totalItems}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <p className="text-sm text-gray-600">Total Qty</p>
          <p className="text-2xl font-bold text-green-900">{report.totalQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded border border-purple-200">
          <p className="text-sm text-gray-600">Total Valuation</p>
          <p className="text-2xl font-bold text-purple-900">Rs. {report.totalValuation.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded border border-orange-200">
          <p className="text-sm text-gray-600">Store</p>
          <p className="text-2xl font-bold text-orange-900">{report.store_name}</p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Item Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Qty</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Reorder</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Cost</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Valuation</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.items.map((item) => (
              <tr key={item.item_code} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{item.item_code}</td>
                <td className="px-6 py-4">{item.item_name}</td>
                <td className="px-6 py-4 text-sm">{item.category_name}</td>
                <td className="px-6 py-4 font-semibold">{item.quantity_on_hand.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">{item.reorder_level}</td>
                <td className="px-6 py-4 text-sm">Rs. {item.cost_price.toLocaleString()}</td>
                <td className="px-6 py-4 font-semibold">Rs. {item.valuation.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${statusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
