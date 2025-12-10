'use client';

import { useState, useEffect } from 'react';

interface DailySalesData {
  invoice_number: string;
  customer_name?: string;
  store_name: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  sale_date: string;
}

interface DailySalesReport {
  date: string;
  invoices: DailySalesData[];
  totalAmount: number;
  invoiceCount: number;
  byStatus: Record<string, number>;
}

export default function DailySalesReportPage() {
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [storeFilter, setStoreFilter] = useState('');

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, storeFilter]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('fromDate', fromDate);
      params.append('toDate', toDate);
      if (storeFilter) params.append('storeId', storeFilter);

      const res = await fetch(`/api/reports/daily-sales?${params}`);
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
      paid: 'bg-green-100 text-green-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    if (!report?.invoices) return;

    let csv = 'Invoice #,Customer,Store,Amount,Method,Status,Date\n';
    report.invoices.forEach((inv) => {
      csv += `${inv.invoice_number},"${inv.customer_name}","${inv.store_name}",${inv.total_amount},"${inv.payment_method}","${inv.payment_status}","${inv.sale_date}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-sales-${fromDate}-${toDate}.csv`;
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
      <h1 className="text-3xl font-bold mb-6">📊 Daily Sales Report</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border px-3 py-2 rounded"
          />
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
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-blue-900">Rs. {report.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <p className="text-sm text-gray-600">Invoices</p>
          <p className="text-2xl font-bold text-green-900">{report.invoiceCount}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <p className="text-sm text-gray-600">Partially Paid</p>
          <p className="text-2xl font-bold text-yellow-900">{report.byStatus.partially_paid || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <p className="text-sm text-gray-600">Unpaid</p>
          <p className="text-2xl font-bold text-red-900">{report.byStatus.unpaid || 0}</p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Invoice #</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Store</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Method</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.invoices.map((inv) => (
              <tr key={inv.invoice_number} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{inv.invoice_number}</td>
                <td className="px-6 py-4">{inv.customer_name || 'Walk-in'}</td>
                <td className="px-6 py-4">{inv.store_name}</td>
                <td className="px-6 py-4 font-semibold">Rs. {inv.total_amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">{inv.payment_method.replace('_', ' ')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${statusColor(inv.payment_status)}`}>
                    {inv.payment_status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{new Date(inv.sale_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
