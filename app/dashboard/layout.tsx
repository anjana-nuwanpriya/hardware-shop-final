import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">Hardware Shop</h1>
        </div>

        <nav className="px-4 py-6 space-y-2">
          <NavLink href="/dashboard" label="Dashboard" />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="px-4 text-sm font-semibold text-gray-500 uppercase">
              Masters
            </p>
            <NavLink href="/masters/categories" label="Categories" />
            <NavLink href="/masters/suppliers" label="Suppliers" />
            <NavLink href="/masters/customers" label="Customers" />
            <NavLink href="/masters/items" label="Items" />
            <NavLink href="/masters/stores" label="Stores" />
            <NavLink href="/masters/employees" label="Employees" />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="px-4 text-sm font-semibold text-gray-500 uppercase">
              Stock
            </p>
            <NavLink href="/stock/opening-stock" label="Opening Stock" />
            <NavLink href="/stock/current-stock" label="Current Stock" />
            <NavLink href="/stock/adjustments" label="Adjustments" />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="px-4 text-sm font-semibold text-gray-500 uppercase">
              Sales
            </p>
            <NavLink href="/sales/invoices" label="Invoices" />
            <NavLink href="/sales/returns" label="Returns" />
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href="/auth/login"
              className="block px-4 py-2 text-red-600 hover:bg-red-50 rounded transition"
            >
              Logout
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex-1">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome</h2>
            <div className="text-sm text-gray-600">User</div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition"
    >
      {label}
    </Link>
  );
}
