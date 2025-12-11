'use client';

import { useState, useEffect } from 'react';

interface Store {
  id: string;
  code: string;
  name: string;
}

interface StockItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  category_name: string;
  quantity_on_hand: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_level: number;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  unit_of_measure: string;
  cost_valuation: number;
  retail_valuation: number;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  last_restock_date: string;
  profit_margin_per_unit: number;
  profit_margin_total: number;
}

interface StockSummary {
  total_items: number;
  total_quantity_on_hand: number;
  total_reserved_quantity: number;
  total_available_quantity: number;
  total_cost_valuation: number;
  total_retail_valuation: number;
  total_profit_margin: number;
  by_status: {
    ok_count: number;
    low_count: number;
    critical_count: number;
    out_of_stock_count: number;
  };
}

export default function CurrentStockPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [items, setItems] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof StockItem>('item_code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setStoresLoading(true);
        const response = await fetch('/api/stores?limit=100');
        const data = await response.json();
        if (!data.success || !data.stores) {
          setError('Failed to fetch stores');
          setStores([]);
          setStoresLoading(false);
          return;
        }
        const activeStores = data.stores;
        if (activeStores.length === 0) {
          setError('No stores available');
          setStores([]);
          setStoresLoading(false);
          return;
        }
        setStores(activeStores);
        setSelectedStore(activeStores[0].id);
        setError('');
      } catch (err) {
        setError('Failed to fetch stores');
        setStores([]);
      } finally {
        setStoresLoading(false);
      }
    };
    fetchStores();
  }, []);

  useEffect(() => {
    if (!selectedStore) {
      setLoading(false);
      return;
    }
    const fetchStock = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('store_id', selectedStore);
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        const response = await fetch(`/api/stock/by-store?${params}`);
        const data = await response.json();
        if (!data.success) {
          setError(data.error || 'Failed to fetch stock');
          setItems([]);
          setSummary(null);
          return;
        }
        setItems(data.data || []);
        setSummary(data.summary);
        setError('');
        setExpandedRow(null);
      } catch (err) {
        setError('Error fetching stock data');
        setItems([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchStock, 300);
    return () => clearTimeout(timer);
  }, [selectedStore, searchTerm, statusFilter]);

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    const numA = Number(aVal) || 0;
    const numB = Number(bVal) || 0;
    return sortOrder === 'asc' ? numA - numB : numB - numA;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OK: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
      LOW: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      CRITICAL: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
      OUT_OF_STOCK: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
    };
    return colors[status] || 'bg-slate-50';
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      OK: 'bg-emerald-100 text-emerald-800',
      LOW: 'bg-amber-100 text-amber-800',
      CRITICAL: 'bg-rose-100 text-rose-800',
      OUT_OF_STOCK: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || 'bg-slate-100';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      OK: '✓',
      LOW: '⚠',
      CRITICAL: '⚡',
      OUT_OF_STOCK: '✕',
    };
    return icons[status] || '•';
  };

  const handleSort = (column: keyof StockItem) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const selectedStoreName = stores.find((s) => s.id === selectedStore)?.name || 'Select Store';

  if (storesLoading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading stores...</div>;
  }

  return (
    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">📦 Stock Management</h1>
        <p className="text-sm text-gray-600">Real-time inventory levels & valuations</p>
      </div>

      {/* Store Selection */}
      <div className="mb-5 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-800 mb-3">Select Store</label>
        {stores.length === 0 ? (
          <p className="text-rose-600 text-sm">No stores available</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => setSelectedStore(store.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                  selectedStore === store.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="font-semibold text-xs text-gray-900">{store.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{store.code}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">Total Items</p>
            <p className="text-2xl font-bold">{summary.total_items}</p>
            <p className="text-xs mt-2 opacity-75">✓ {summary.by_status.ok_count} OK</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">Total Qty</p>
            <p className="text-2xl font-bold">{summary.total_quantity_on_hand.toLocaleString()}</p>
            <p className="text-xs mt-2 opacity-75">↓ {summary.total_reserved_quantity} reserved</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">Cost Value</p>
            <p className="text-2xl font-bold">LKR {(summary.total_cost_valuation / 1000000).toFixed(1)}M</p>
            <p className="text-xs mt-2 opacity-75">@ cost</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">Retail Value</p>
            <p className="text-2xl font-bold">LKR {(summary.total_retail_valuation / 1000000).toFixed(1)}M</p>
            <p className="text-xs mt-2 opacity-75">@ retail</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow p-4 text-white">
            <p className="text-xs opacity-90 mb-1">Profit Potential</p>
            <p className="text-2xl font-bold">LKR {(summary.total_profit_margin / 1000000).toFixed(1)}M</p>
            <p className="text-xs mt-2 opacity-75">margin</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap mb-3">
          {['all', 'OK', 'LOW', 'CRITICAL', 'OUT_OF_STOCK'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? '📋 All Items' : `${getStatusIcon(status)} ${status}`}
              {summary && status !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({summary.by_status[`${status.toLowerCase()}_count` as keyof typeof summary.by_status]})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by code, name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="inline-flex items-center gap-2 text-xs text-gray-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            Loading stock data...
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left w-6"></th>
                  {[
                    { key: 'item_code', label: 'Code' },
                    { key: 'item_name', label: 'Name' },
                    { key: 'category_name', label: 'Category' },
                    { key: 'quantity_on_hand', label: 'Qty' },
                    { key: 'reorder_level', label: 'Reorder' },
                    { key: 'status', label: 'Status' },
                    { key: 'cost_valuation', label: 'Cost Val' },
                    { key: 'retail_valuation', label: 'Retail Val' },
                    { key: 'profit_margin_total', label: 'Profit' },
                    { key: 'last_restock_date', label: 'Restock' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key as keyof StockItem)}
                      className="px-3 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        {sortBy === col.key && (
                          <span className="text-blue-600">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-gray-500">
                      No items found in {selectedStoreName}
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-l-4 border-l-transparent transition hover:shadow-sm ${getStatusColor(item.status)} ${
                        item.status === 'OK' ? 'border-l-emerald-500' :
                        item.status === 'LOW' ? 'border-l-amber-500' :
                        item.status === 'CRITICAL' ? 'border-l-rose-500' : 'border-l-slate-500'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                          className="text-gray-400 hover:text-gray-600 transition text-lg"
                        >
                          {expandedRow === item.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{item.item_code}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{item.item_name}</td>
                      <td className="px-3 py-2 text-gray-700">{item.category_name}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{item.quantity_on_hand}</td>
                      <td className="px-3 py-2 text-gray-700">{item.reorder_level}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadgeColor(item.status)}`}>
                          {getStatusIcon(item.status)} {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-900">LKR {(item.cost_valuation / 100000).toFixed(0)}L</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">LKR {(item.retail_valuation / 100000).toFixed(0)}L</td>
                      <td className="px-3 py-2 font-bold text-emerald-600">LKR {(item.profit_margin_total / 100000).toFixed(0)}L</td>
                      <td className="px-3 py-2 text-gray-600">
                        {item.last_restock_date
                          ? new Date(item.last_restock_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details */}
      {expandedRow && !loading && sortedItems.find((item) => item.id === expandedRow) && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <ItemDetailsView
            item={sortedItems.find((item) => item.id === expandedRow)!}
            storeName={selectedStoreName}
            onClose={() => setExpandedRow(null)}
          />
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Showing <strong>{sortedItems.length}</strong> items in <strong>{selectedStoreName}</strong>
      </div>
    </div>
  );
}

function ItemDetailsView({
  item,
  storeName,
  onClose,
}: {
  item: StockItem;
  storeName: string;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{item.item_code} • {item.item_name}</h2>
          <p className="text-xs text-gray-600 mt-1">📍 {storeName}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">×</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-bold text-blue-900 mb-3 pb-2 border-b border-blue-300">📦 Inventory</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">Qty on Hand</span>
              <span className="font-bold text-blue-900">{item.quantity_on_hand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Reserved</span>
              <span className="font-semibold text-amber-700">{item.reserved_quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Available</span>
              <span className="font-bold text-emerald-700">{item.available_quantity}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-300">
              <span className="text-gray-700">Reorder Level</span>
              <span className="font-semibold">{item.reorder_level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Unit</span>
              <span className="font-semibold">{item.unit_of_measure}</span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-bold text-purple-900 mb-3 pb-2 border-b border-purple-300">💰 Pricing</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">Cost Price</span>
              <span className="font-bold">LKR {(item.cost_price / 1000).toFixed(1)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Retail Price</span>
              <span className="font-bold text-emerald-700">LKR {(item.retail_price / 1000).toFixed(1)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Wholesale</span>
              <span className="font-semibold">LKR {(item.wholesale_price / 1000).toFixed(1)}K</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-purple-300">
              <span className="text-gray-700">Profit/Unit</span>
              <span className="font-bold text-emerald-700">LKR {(item.profit_margin_per_unit / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </div>

        {/* Valuations */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
          <h3 className="text-sm font-bold text-emerald-900 mb-3 pb-2 border-b border-emerald-300">📊 Valuations</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">Cost Val</span>
              <span className="font-semibold">LKR {(item.cost_valuation / 100000).toFixed(0)}L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Retail Val</span>
              <span className="font-bold text-emerald-700">LKR {(item.retail_valuation / 100000).toFixed(0)}L</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-emerald-300">
              <span className="text-gray-700">Profit Margin</span>
              <span className="font-bold text-emerald-700">LKR {(item.profit_margin_total / 100000).toFixed(0)}L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Margin %</span>
              <span className="font-bold text-emerald-700">
                {item.retail_price > 0 ? ((item.profit_margin_per_unit / item.retail_price) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}