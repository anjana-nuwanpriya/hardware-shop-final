'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface HistoryRecord {
  created_at: string;
  transaction_type: string;
  quantity: number;
  batch_no: string;
  reference_type: string;
  created_by: string;
  running_balance: number;
}

export default function StockHistoryPage() {
  const params = useParams();
  const itemId = params.id as string;
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemName, setItemName] = useState('');

  useEffect(() => {
    const store = localStorage.getItem('selectedStore') || 'Main Store';
    fetchHistory(store);
  }, [itemId]);

  const fetchHistory = async (store: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/stock/${itemId}/history?store=${encodeURIComponent(store)}&days=30`
      );
      const data = await res.json();
      if (data.success) {
        setHistory(data.data || []);
        setItemName(data.itemName || 'Unknown Item');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionColor = (type: string) => {
    if (type.includes('in')) return 'text-green-600 bg-green-50';
    if (type.includes('out') || type === 'sale') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'opening_stock') return '📥';
    if (type === 'grn') return '📦';
    if (type === 'sale') return '🛍️';
    if (type === 'sales_return') return '↩️';
    if (type === 'purchase_return') return '↪️';
    if (type.includes('adjustment_in')) return '➕';
    if (type.includes('adjustment_out')) return '➖';
    if (type.includes('transfer_in')) return '📨';
    if (type.includes('transfer_out')) return '📤';
    return '📋';
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📈 Stock Movement History</h1>
        <p className="text-gray-600">Item: <span className="font-semibold">{itemName}</span></p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Inward</p>
          <p className="text-2xl font-bold text-green-900">
            {history.filter((h) => h.quantity > 0).reduce((sum, h) => sum + h.quantity, 0)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total Outward</p>
          <p className="text-2xl font-bold text-red-900">
            {Math.abs(history.filter((h) => h.quantity < 0).reduce((sum, h) => sum + h.quantity, 0))}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Last 30 Days</p>
          <p className="text-2xl font-bold text-blue-900">{history.length}</p>
        </div>
      </div>

      {/* History Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Qty</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Running Balance</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Batch No</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">By</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((record, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(record.created_at).toLocaleDateString()}
                      <div className="text-xs text-gray-500">
                        {new Date(record.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`${getTransactionColor(record.transaction_type)} px-3 py-1 rounded-full flex items-center w-fit`}>
                        {getTransactionIcon(record.transaction_type)} {record.transaction_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold">
                      <span className={record.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {record.quantity > 0 ? '+' : ''}{record.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                      {record.running_balance}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {record.batch_no || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.created_by || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No movement history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}