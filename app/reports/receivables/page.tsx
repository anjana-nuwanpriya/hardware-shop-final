'use client';

import { useState, useEffect } from 'react';

interface ReceivableItem {
  customer_name: string;
  total_outstanding: number;
  days_0_30: number;
  days_30_60: number;
  days_60_plus: number;
}

interface ReceivablesReport {
  totalOutstanding: number;
  total_0_30: number;
  total_30_60: number;
  total_60_plus: number;
  items: ReceivableItem[];
}

export default function ReceivablesReportPage() {
  const [report, setReport] = useState<ReceivablesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/receivables-aging');
      const data = await res.json();
      setReport(data.data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report?.items) return;

    let csv = 'Customer,Total Outstanding,0-30 Days,30-60 Days,60+ Days\n';
    report.items.forEach((item) => {
      csv += `"${item.customer_name}",${item.total_outstanding},${item.days_0_30},${item.days_30_60},${item.days_60_plus}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receivables-aging-${new Date().toISOString().split('T')[0]}.csv`;
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
      <h1 className="text-3xl font-bold mb-6">📈 Receivables Aging Report</h1>

      {/* Export Button */}
      <div className="mb-6">
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <p className="text-sm text-gray-600">Total Outstanding</p>
          <p className="text-2xl font-bold text-blue-900">Rs. {report.totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <p className="text-sm text-gray-600">0-30 Days</p>
          <p className="text-2xl font-bold text-green-900">Rs. {report.total_0_30.toLocaleString()}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <p className="text-sm text-gray-600">30-60 Days</p>
          <p className="text-2xl font-bold text-yellow-900">Rs. {report.total_30_60.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <p className="text-sm text-gray-600">60+ Days</p>
          <p className="text-2xl font-bold text-red-900">Rs. {report.total_60_plus.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded border border-purple-200">
          <p className="text-sm text-gray-600">Customers</p>
          <p className="text-2xl font-bold text-purple-900">{report.items.length}</p>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Total Outstanding</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">0-30 Days</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">30-60 Days</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">60+ Days</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.items.map((item) => (
              <tr key={item.customer_name} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold">{item.customer_name}</td>
                <td className="px-6 py-4 font-bold">Rs. {item.total_outstanding.toLocaleString()}</td>
                <td className="px-6 py-4 text-green-600">Rs. {item.days_0_30.toLocaleString()}</td>
                <td className="px-6 py-4 text-yellow-600">Rs. {item.days_30_60.toLocaleString()}</td>
                <td className="px-6 py-4 text-red-600">Rs. {item.days_60_plus.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
