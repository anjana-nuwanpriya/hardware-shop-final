import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hardware Shop Management System',
  description: 'Complete inventory and sales management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
