'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    masters: true,
    sales: true,
    purchase: true,
    stock: true,
    payments: true,
    reports: true,
  });

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path: string) => pathname.includes(path);

  const menuItem = (label: string, path: string, icon: string) => (
    <Link href={path}>
      <div
        className={`px-4 py-2 ml-6 rounded transition-colors ${
          isActive(path)
            ? 'bg-blue-600 text-white font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {icon} {label}
      </div>
    </Link>
  );

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600">🏪 Hardware Shop</h1>
        <p className="text-sm text-gray-600">Management System</p>
      </div>

      <nav className="space-y-1">
        {/* Dashboard */}
        <Link href="/dashboard">
          <div
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              isActive('/dashboard')
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📊 Dashboard
          </div>
        </Link>

        {/* WEEK 2: Masters */}
        <div>
          <button
            onClick={() => toggleMenu('masters')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>👥 Masters</span>
            <span>{expandedMenus.masters ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.masters && (
            <div className="space-y-1 mt-2">
              {menuItem('Categories', '/masters/categories', '📁')}
              {menuItem('Suppliers', '/masters/suppliers', '🏭')}
              {menuItem('Customers', '/masters/customers', '👤')}
              {menuItem('Items/Products', '/masters/items', '📦')}
              {menuItem('Stores', '/masters/stores', '🏢')}
              {menuItem('Employees', '/masters/employees', '👔')}
            </div>
          )}
        </div>

        {/* WEEK 3: Stock */}
        <div>
          <button
            onClick={() => toggleMenu('stock')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>📦 Stock Management</span>
            <span>{expandedMenus.stock ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.stock && (
            <div className="space-y-1 mt-2">
              {menuItem('Opening Stock', '/stock/opening-stock', '📥')}
              {menuItem('Current Stock', '/stock/current-stock', '📊')}
              {menuItem('Adjustments', '/stock/adjustments', '🔧')}
            </div>
          )}
        </div>

        {/* WEEK 4: Purchase */}
        <div>
          <button
            onClick={() => toggleMenu('purchase')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>🛒 Purchase</span>
            <span>{expandedMenus.purchase ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.purchase && (
            <div className="space-y-1 mt-2">
              {menuItem('Purchase Orders', '/purchase/orders', '📋')}
              {menuItem('Goods Received', '/purchase/grn', '📦')}
              {menuItem('Purchase Returns', '/purchase/returns', '↩️')}
            </div>
          )}
        </div>

        {/* WEEK 5: Sales */}
        <div>
          <button
            onClick={() => toggleMenu('sales')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>💰 Sales</span>
            <span>{expandedMenus.sales ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.sales && (
            <div className="space-y-1 mt-2">
              {menuItem('Retail Sales', '/sales/retail', '🛍️')}
              {menuItem('Wholesale Sales', '/sales/wholesale', '📦')}
              {menuItem('Sales Returns', '/sales/returns', '↩️')}
              {menuItem('Quotations', '/sales/quotations', '💬')}
            </div>
          )}
        </div>

        {/* WEEK 6: Payments */}
        <div>
          <button
            onClick={() => toggleMenu('payments')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>💳 Payments</span>
            <span>{expandedMenus.payments ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.payments && (
            <div className="space-y-1 mt-2">
              {menuItem('Customer Payments', '/payments/customer', '📥')}
              {menuItem('Supplier Payments', '/payments/supplier', '📤')}
            </div>
          )}
        </div>

        {/* WEEK 8: Reports */}
        <div>
          <button
            onClick={() => toggleMenu('reports')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>📈 Reports</span>
            <span>{expandedMenus.reports ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.reports && (
            <div className="space-y-1 mt-2">
              {menuItem('Daily Sales', '/reports/daily-sales', '📊')}
              {menuItem('Stock Report', '/reports/stock', '📦')}
              {menuItem('Receivables Aging', '/reports/receivables', '👤')}
              {menuItem('Payables Aging', '/reports/payables', '🏭')}
            </div>
          )}
        </div>

        {/* WEEK 7: Settings & Audit */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <Link href="/settings">
            <div
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                isActive('/settings')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⚙️ Settings
            </div>
          </Link>
          <Link href="/audit-logs">
            <div
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                isActive('/audit-logs')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              📋 Audit Logs
            </div>
          </Link>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="mt-12 p-4 bg-blue-50 rounded border border-blue-200 text-sm text-blue-900">
        <p className="font-semibold mb-2">✅ System Complete</p>
        <ul className="space-y-1 text-xs">
          <li>✓ Week 1-2: Core Setup + Masters</li>
          <li>✓ Week 3-4: Stock + Purchase</li>
          <li>✓ Week 5-6: Sales + Payments</li>
          <li>✓ Week 7-8: Features + Reports</li>
        </ul>
      </div>
    </div>
  );
}
