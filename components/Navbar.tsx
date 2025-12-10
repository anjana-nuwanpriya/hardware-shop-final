'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState('Main Store');
  const router = useRouter();

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setUser(null);
      }
    }

    const selectedStore = localStorage.getItem('selectedStore');
    if (selectedStore) {
      setStore(selectedStore);
    }
  }, []);

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleStoreChange = (newStore: string) => {
    setStore(newStore);
    localStorage.setItem('selectedStore', newStore);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
      {/* Left Side - Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hardware Shop ERP</h2>
        <p className="text-sm text-gray-600">
          📍 <span className="font-semibold">{store}</span>
        </p>
      </div>

      {/* Right Side - Controls */}
      <div className="flex items-center gap-6">
        {/* Store Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Select Store:</label>
          <select
            value={store}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Main Store</option>
            <option>Branch Store</option>
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300"></div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
            <p className="text-xs text-gray-600">{user?.role || 'Administrator'}</p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="ml-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}