'use client';

import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-1.5 flex justify-end">
      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-3 py-0.5 rounded text-xs font-medium hover:bg-red-700 transition"
      >
        Logout
      </button>
    </div>
  );
}