'use client';

import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password/', { email });
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="w-full max-w-md bg-white p-8 rounded-lg shadow-2xl space-y-5">
        <h2 className="text-2xl font-bold text-center text-blue-950">Reset Your Password</h2>
        <p className="text-center text-gray-700 text-sm">
          If your email exists in our system, you&apos;ll receive a password reset link.
        </p>

        {message && <p className="text-green-600 text-center text-sm">{message}</p>}
        {error && <p className="text-red-600 text-center text-sm">{error}</p>}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
          <input
            id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-md transition-colors"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="text-center text-gray-600 text-sm">
          Return to <Link href="/login" className="text-blue-700 hover:underline">Sign In</Link>
        </p>
      </form>
    </Shell>
  );
}