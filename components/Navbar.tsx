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
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-end">
      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm"
      >
        Logout
      </button>
    </div>
  );
}