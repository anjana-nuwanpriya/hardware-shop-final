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

  // Fetch stores on mount
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

        // API already returns only active stores
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
        console.error('Error fetching stores:', err);
        setError('Failed to fetch stores');
        setStores([]);
      } finally {
        setStoresLoading(false);
      }
    };

    fetchStores();
  }, []);

  // Fetch stock data when store or filters change
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
        console.error(err);
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
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }

    const numA = Number(aVal) || 0;
    const numB = Number(bVal) || 0;
    return sortOrder === 'asc' ? numA - numB : numB - numA;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'LOW':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'OUT_OF_STOCK':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-green-100 text-green-800';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'OUT_OF_STOCK':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading stores...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Current Stock</h1>
        <p className="text-gray-600">Real-time inventory levels and valuation by store</p>
      </div>

      {/* Store Selection */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          📍 Select Store
        </label>
        {stores.length === 0 ? (
          <p className="text-red-600">No stores available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => setSelectedStore(store.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedStore === store.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{store.name}</div>
                <div className="text-sm text-gray-600">{store.code}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium mb-1">Total Items</p>
            <p className="text-3xl font-bold text-gray-900">{summary.total_items}</p>
            <p className="text-green-600 text-xs mt-1">✓ {summary.by_status.ok_count} OK</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium mb-1">Total Qty</p>
            <p className="text-3xl font-bold text-gray-900">
              {summary.total_quantity_on_hand.toLocaleString()}
            </p>
            <p className="text-blue-600 text-xs mt-1">↓ {summary.total_reserved_quantity} reserved</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium mb-1">Cost Value</p>
            <p className="text-3xl font-bold text-gray-900">
              LKR {(summary.total_cost_valuation / 1000).toFixed(1)}K
            </p>
            <p className="text-gray-500 text-xs mt-1">@ cost price</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium mb-1">Retail Value</p>
            <p className="text-3xl font-bold text-gray-900">
              LKR {(summary.total_retail_valuation / 1000).toFixed(1)}K
            </p>
            <p className="text-gray-500 text-xs mt-1">@ retail price</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-medium mb-1">Total Profit</p>
            <p className="text-3xl font-bold text-green-600">
              LKR {(summary.total_profit_margin / 1000).toFixed(1)}K
            </p>
            <p className="text-gray-500 text-xs mt-1">available profit</p>
          </div>
        </div>
      )}

      {/* Status Filter & Search */}
      <div className="mb-6 space-y-4">
        {/* Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'OK', 'LOW', 'CRITICAL', 'OUT_OF_STOCK'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300'
              }`}
            >
              {status === 'all' ? 'All Items' : status}
              {summary && status !== 'all' && (
                <span className="ml-2 text-xs opacity-75">
                  ({summary.by_status[`${status.toLowerCase()}_count` as keyof typeof summary.by_status]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by code, name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-gray-700 font-semibold w-12"></th>
                  {[
                    { key: 'item_code', label: 'Code' },
                    { key: 'item_name', label: 'Name' },
                    { key: 'category_name', label: 'Category' },
                    { key: 'quantity_on_hand', label: 'Qty' },
                    { key: 'reorder_level', label: 'Reorder' },
                    { key: 'status', label: 'Status' },
                    { key: 'cost_valuation', label: 'Cost Value' },
                    { key: 'retail_valuation', label: 'Retail Value' },
                    { key: 'profit_margin_total', label: 'Profit' },
                    { key: 'last_restock_date', label: 'Last Restock' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key as keyof StockItem)}
                      className="px-6 py-4 text-left text-gray-700 font-semibold cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        <span className="text-xs text-gray-400">
                          {sortBy === col.key && (sortOrder === 'asc' ? '↑' : '↓')}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                      No items found in {selectedStoreName}
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${getStatusColor(
                        item.status
                      )}`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                          className="text-gray-400 hover:text-gray-600 text-xl"
                        >
                          {expandedRow === item.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-gray-900">{item.item_code}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.item_name}</td>
                      <td className="px-6 py-4 text-gray-700">{item.category_name}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.quantity_on_hand}</td>
                      <td className="px-6 py-4 text-gray-700">{item.reorder_level}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">LKR {item.cost_valuation.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-900">LKR {item.retail_valuation.toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-green-600">
                        LKR {item.profit_margin_total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {item.last_restock_date
                          ? new Date(item.last_restock_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
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

      {/* Expanded Details */}
      {expandedRow && !loading && (
        <div className="mt-6 bg-white p-8 rounded-lg shadow">
          {sortedItems.find((item) => item.id === expandedRow) && (
            <ItemDetailsView
              item={sortedItems.find((item) => item.id === expandedRow)!}
              storeName={selectedStoreName}
              onClose={() => setExpandedRow(null)}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Showing {sortedItems.length} items in <strong>{selectedStoreName}</strong>
        </p>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {item.item_code} - {item.item_name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">📍 Store: {storeName}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Inventory */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Inventory
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600">Qty on Hand</p>
              <p className="font-bold text-2xl">{item.quantity_on_hand}</p>
            </div>
            <div>
              <p className="text-gray-600">Reserved</p>
              <p className="font-semibold">{item.reserved_quantity}</p>
            </div>
            <div>
              <p className="text-gray-600">Available</p>
              <p className="font-semibold text-green-600">{item.available_quantity}</p>
            </div>
            <div>
              <p className="text-gray-600">Reorder Level</p>
              <p className="font-semibold">{item.reorder_level}</p>
            </div>
            <div>
              <p className="text-gray-600">Unit of Measure</p>
              <p className="font-semibold">{item.unit_of_measure}</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Pricing
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600">Cost Price</p>
              <p className="font-semibold text-lg">LKR {item.cost_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Retail Price</p>
              <p className="font-semibold text-lg">LKR {item.retail_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Wholesale Price</p>
              <p className="font-semibold text-lg">LKR {item.wholesale_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Profit per Unit</p>
              <p className="font-semibold text-green-600">
                LKR {item.profit_margin_per_unit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Valuations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Valuations
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600">Cost Valuation</p>
              <p className="font-semibold">LKR {item.cost_valuation.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Retail Valuation</p>
              <p className="font-semibold text-green-600">LKR {item.retail_valuation.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Profit Margin</p>
              <p className="font-semibold text-green-600">LKR {item.profit_margin_total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Margin %</p>
              <p className="font-semibold">
                {item.retail_price > 0
                  ? ((item.profit_margin_per_unit / item.retail_price) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}