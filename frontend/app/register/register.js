'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';

const NAME_RE = /^[a-zA-Z]{2,}$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PSW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function validate(f) {
  const e = {};
  if (!NAME_RE.test(f.fname)) e.fname = 'First name: letters only, at least 2.';
  if (!NAME_RE.test(f.lname)) e.lname = 'Last name: letters only, at least 2.';
  if (!EMAIL_RE.test(f.email)) e.email = 'Enter a valid email.';
  if (!PSW_RE.test(f.password)) e.password = 'At least 8 characters with upper, lower, number and symbol (e.g. Abc#1234).';
  if (f.password !== f.confirm) e.confirm = 'Passwords do not match.';
  return e;
}

function Field({ label, name, type = 'text', form, setForm, errors, touched }) {
  return (
    <div>
      <label htmlFor={name} className="block mb-1 font-medium text-gray-700">{label}</label>
      <input
        id={name} type={type} value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {touched && errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fname: '', lname: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });
  const [loading, setLoading] = useState(false);
  const errors = validate(form);

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) {
      setMessage({ text: 'Please fix the errors above.', error: true });
      return;
    }
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      const res = await api.post('/api/auth/register/', payload);
      setMessage({ text: res.message || 'Registration successful!', error: false });
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  }

  const shared = { form, setForm, errors, touched };

  return (
    <Shell>
      <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-lg shadow-2xl p-6 space-y-4">
        <h2 className="text-2xl text-center text-blue-950 font-semibold">Create your account</h2>
        <p className="text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-950 hover:underline">Login here</Link>
        </p>

        <Field label="First Name:" name="fname" {...shared} />
        <Field label="Last Name:" name="lname" {...shared} />
        <Field label="Email:" name="email" type="email" {...shared} />
        <Field label="Password:" name="password" type="password" {...shared} />
        <Field label="Confirm Password:" name="confirm" type="password" {...shared} />

        <button
          type="submit" disabled={loading}
          className="w-40 bg-blue-950 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2 rounded-3xl mx-auto block transition-colors"
        >
          {loading ? '...' : 'Create account'}
        </button>

        {message.text && (
          <p className={`text-center font-semibold ${message.error ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
      </form>
    </Shell>
  );
}