'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(user.is_staff ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-lg shadow-2xl p-6 space-y-4">
        <h2 className="text-2xl text-center text-blue-950 font-semibold">Login</h2>
        <p className="text-center text-gray-700">Get access to submit new news</p>
        {error && <p className="text-red-600 text-center">{error}</p>}

        <p className="text-center text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-950 hover:underline">Register here</Link>
        </p>

        <div>
          <label htmlFor="email" className="block mb-1 font-medium text-gray-700">Email:</label>
          <input
            id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <label htmlFor="psw" className="block mb-1 font-medium text-gray-700">Password:</label>
          <input
            id="psw" type={show ? 'text' : 'password'} required value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-2 pr-16 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-[38px] text-sm text-gray-500 cursor-pointer"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-28 bg-blue-950 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2 rounded-3xl mx-auto block transition-colors"
        >
          {loading ? '...' : 'Submit'}
        </button>

        <Link href="/forgot-password" className="hover:underline text-gray-600 block">Forgot password?</Link>
      </form>
    </Shell>
  );
}