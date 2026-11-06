'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-4 bg-gray-900 border-b-2 border-gray-700">
        <Link href="/" className="uppercase font-bold text-white text-xl">
          Fake News Detection System
        </Link>
        <div className="flex items-center gap-4 text-white text-sm">
          {user ? (
            <>
              <Link href={user.is_staff ? '/admin' : '/dashboard'} className="hover:underline">
                {user.is_staff ? 'Admin' : 'My contributions'}
              </Link>
              <button onClick={handleLogout} className="hover:underline cursor-pointer">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="hover:underline">
              Login
            </Link>
          )}
        </div>
      </nav>

      <main className="flex-1 pt-24 pb-12 px-4 flex flex-col items-center">{children}</main>

      <footer className="bg-gray-900 text-gray-400 text-sm py-8 text-center">
        <p className="uppercase font-bold text-white mb-1">Fake News Detection System</p>
        <p>Your trusted news detector</p>
        <p className="mt-4 text-gray-500">&copy; 2025 Fake News Detection System. All rights reserved.</p>
      </footer>
    </div>
  );
}