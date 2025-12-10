'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StockItem {
  id: string;
  item_code: string;
  item_name: string;
  category_name: string;
  quantity_on_hand: number;
  reorder_level: number;
  cost_price: number;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  valuation: number;
  last_restock_date: string;
}

export default function CurrentStockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const selectedStore = localStorage.getItem('selectedStore') || 'Main Store';
    setStore(selectedStore);
    fetchStock(selectedStore);
  }, []);

  const fetchStock = async (storeName: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stock/current?store=${encodeURIComponent(storeName)}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'OUT_OF_STOCK':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_code.toLowerCase().includes(search.toLowerCase()) ||
      item.item_name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || item.status === filter;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading stock...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Current Stock</h1>
          <p className="text-gray-600">Store: <span className="font-semibold">{store}</span></p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900">{items.reduce((sum, item) => sum + item.quantity_on_hand, 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Valuation</p>
          <p className="text-2xl font-bold text-gray-900">
            Rs. {items.reduce((sum, item) => sum + item.valuation, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Low Stock Items</p>
          <p className="text-2xl font-bold text-red-600">
            {items.filter((i) => i.status === 'LOW' || i.status === 'CRITICAL').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by item code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="OK">OK</option>
          <option value="LOW">Low</option>
          <option value="CRITICAL">Critical</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Item Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Item Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Qty</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Reorder</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Valuation</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.item_code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.item_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.category_name}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                    {item.quantity_on_hand.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{item.reorder_level}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    Rs. {item.valuation.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/stock/current-stock/${item.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      History
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}