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

  const menuItem = (label: string, path: string) => (
    <Link href={path}>
      <div
        className={`px-4 py-2 ml-6 rounded transition-colors ${
          isActive(path)
            ? 'bg-blue-600 text-white font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {label}
      </div>
    </Link>
  );

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen p-4 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600">Hardware Shop</h1>
        <p className="text-sm text-gray-600">Management System</p>
      </div>

      <nav className="space-y-2">
        {/* Dashboard */}
        <Link href="/dashboard">
          <div
            className={`px-4 py-2 rounded font-semibold transition-colors ${
              isActive('/dashboard')
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </div>
        </Link>

        {/* Masters */}
        <div>
          <button
            onClick={() => toggleMenu('masters')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>1. Masters</span>
            <span className="text-sm">{expandedMenus.masters ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.masters && (
            <div className="space-y-1 mt-2">
              {menuItem('Suppliers', '/masters/suppliers')}
              {menuItem('Customers', '/masters/customers')}
              {menuItem('Items', '/masters/items')}
              {menuItem('Stores', '/masters/stores')}
              {menuItem('Categories', '/masters/categories')}
              {menuItem('Employees', '/masters/employees')}
            </div>
          )}
        </div>

        {/* Sales */}
        <div>
          <button
            onClick={() => toggleMenu('sales')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>2. Sales</span>
            <span className="text-sm">{expandedMenus.sales ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.sales && (
            <div className="space-y-1 mt-2">
              {menuItem('Retail Sales', '/sales/retail')}
              {menuItem('Wholesale Sales', '/sales/wholesale')}
              {menuItem('Quotations', '/sales/quotations')}
              {menuItem('Sales Returns', '/sales/returns')}
            </div>
          )}
        </div>

        {/* Purchase */}
        <div>
          <button
            onClick={() => toggleMenu('purchase')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>3. Purchase</span>
            <span className="text-sm">{expandedMenus.purchase ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.purchase && (
            <div className="space-y-1 mt-2">
              {menuItem('Purchase Orders', '/purchase/orders')}
              {menuItem('Goods Received', '/purchase/grn')}
              {menuItem('Purchase Returns', '/purchase/returns')}
            </div>
          )}
        </div>

        {/* Stock Management */}
        <div>
          <button
            onClick={() => toggleMenu('stock')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>4. Stock Management</span>
            <span className="text-sm">{expandedMenus.stock ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.stock && (
            <div className="space-y-1 mt-2">
              {menuItem('Opening Stock', '/stock/opening-stock')}
              {menuItem('Current Stock', '/stock/current-stock')}
              {menuItem('Adjustments', '/stock/adjustments')}
              {menuItem('Dispatch', '/stock/dispatch')}
            </div>
          )}
        </div>

        {/* Payments */}
        <div>
          <button
            onClick={() => toggleMenu('payments')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>5. Payments</span>
            <span className="text-sm">{expandedMenus.payments ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.payments && (
            <div className="space-y-1 mt-2">
              {menuItem('Customer Payments', '/payments/customer')}
              {menuItem('Supplier Payments', '/payments/supplier')}
            </div>
          )}
        </div>

        {/* Reports */}
        <div>
          <button
            onClick={() => toggleMenu('reports')}
            className="w-full px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 rounded flex items-center justify-between"
          >
            <span>6. Reports</span>
            <span className="text-sm">{expandedMenus.reports ? '▼' : '▶'}</span>
          </button>
          {expandedMenus.reports && (
            <div className="space-y-1 mt-2">
              {menuItem('Daily Sales', '/reports/daily-sales')}
              {menuItem('Stock Report', '/reports/stock')}
              {menuItem('Receivables Aging', '/reports/receivables')}
              {menuItem('Payables Aging', '/reports/payables')}
            </div>
          )}
        </div>

        {/* Settings & Audit */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <Link href="/settings">
            <div
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                isActive('/settings')
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Settings
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
              Audit Logs
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}