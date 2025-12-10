import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Hardware Shop Management System',
  description: 'Complete ERP for hardware retail businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <div className="flex h-screen">
          {/* Sidebar - Fixed left */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navbar - Only ONE place */}
            <Navbar />

            {/* Page Content - Scrollable */}
            <main className="flex-1 overflow-auto">
              <div className="p-6 bg-gray-100 min-h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}