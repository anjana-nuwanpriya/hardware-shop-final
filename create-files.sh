# Stop the dev server first (Ctrl+C in terminal)
# Then run these commands:

# Remove the problematic folders
rm -rf "app/(auth)" "app/(app)"

# Create new structure without parentheses
mkdir -p app/auth/login
mkdir -p app/dashboard
mkdir -p app/masters/categories
mkdir -p app/masters/suppliers
mkdir -p app/masters/customers
mkdir -p app/masters/items
mkdir -p app/masters/stores
mkdir -p app/masters/employees
mkdir -p app/stock/opening-stock
mkdir -p app/stock/current-stock
mkdir -p app/stock/adjustments
mkdir -p app/sales/invoices
mkdir -p app/sales/returns

# Create auth layout
cat > app/auth/layout.tsx << 'EOF'
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {children}
      </div>
    </div>
  );
}
EOF

# Create login page
cat > app/auth/login/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { LoginSchema, type LoginInput } from '@/lib/validation';
import { zodResolver } from '@hookform/resolvers/zod';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError('');

    try {
      router.push('/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">
        Hardware Shop
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            {...register('password')}
            type="password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Demo: Click Login to continue
      </p>
    </div>
  );
}
EOF

# Create dashboard layout
cat > app/dashboard/layout.tsx << 'EOF'
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
EOF

# Create dashboard page
cat > app/dashboard/page.tsx << 'EOF'
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Today's Sales" value="LKR 0" />
        <Card title="Total Receivables" value="LKR 0" />
        <Card title="Total Payables" value="LKR 0" />
        <Card title="Low Stock Items" value="0" />
      </div>

      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">
          More dashboard features coming soon...
        </p>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
EOF

# Update root page.tsx to redirect to login
cat > app/page.tsx << 'EOF'
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/auth/login');
}
EOF

# Create placeholder pages
cat > app/masters/categories/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Categories</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/masters/suppliers/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Suppliers</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/masters/customers/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Customers</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/masters/items/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Items</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/masters/stores/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Stores</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/masters/employees/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Employees</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/stock/opening-stock/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Opening Stock</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/stock/current-stock/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Current Stock</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/stock/adjustments/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Stock Adjustments</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/sales/invoices/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Sales Invoices</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

cat > app/sales/returns/page.tsx << 'EOF'
export default function Page() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Sales Returns</h1>
      <p className="text-gray-600">Coming soon...</p>
    </div>
  );
}
EOF

echo "✅ All files recreated without parentheses!"