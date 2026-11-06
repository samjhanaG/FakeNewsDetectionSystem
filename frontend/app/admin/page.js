'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

function ContributionRow({ c, onChanged, notify }) {
  const [title, setTitle] = useState(c.title || '');
  const [content, setContent] = useState(c.content || '');
  const [csvType, setCsvType] = useState('True');
  const [busy, setBusy] = useState(false);

  async function run(fn, okFallback) {
    setBusy(true);
    try {
      const res = await fn();
      notify(res?.message || okFallback);
      onChanged();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-300 p-3 rounded space-y-2">
      <input
        value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
        className="border p-1 w-full rounded"
      />
      <textarea
        rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content"
        className="border p-1 w-full rounded"
      />
      <div className="flex gap-2 flex-wrap items-center">
        <button
          disabled={busy}
          onClick={() => run(() => api.put(`/api/admin/contributions/${c.id}/`, { title, content }), 'Updated')}
          className="bg-blue-600 hover:bg-blue-800 text-white px-3 py-1 rounded disabled:opacity-60"
        >
          Update
        </button>
        <button
          disabled={busy}
          onClick={() => confirm('Delete this contribution?') && run(() => api.del(`/api/admin/contributions/${c.id}/`), 'Deleted')}
          className="bg-red-600 hover:bg-red-800 text-white px-3 py-1 rounded disabled:opacity-60"
        >
          Delete
        </button>

        <span className="ml-2">Status: <strong>{c.is_approved ? 'Approved' : 'Pending'}</strong></span>

        {!c.is_approved && (
          <>
            <select value={csvType} onChange={(e) => setCsvType(e.target.value)} className="border rounded p-1">
              <option value="True">True.csv (Real)</option>
              <option value="Fake">Fake.csv (Fake)</option>
            </select>
            <button
              disabled={busy}
              onClick={() => run(() => api.post(`/api/admin/contributions/${c.id}/approve/${csvType}/`), 'Approved')}
              className="bg-green-600 hover:bg-green-800 text-white px-3 py-1 rounded disabled:opacity-60"
            >
              {busy ? 'Retraining...' : 'Approve'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { ready } = useRequireAuth({ staff: true });
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState({ text: '', error: false });

  const notify = useCallback((text, isError = false) => {
    setMsg({ text, error: isError });
    setTimeout(() => setMsg({ text: '', error: false }), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      setUsers(await api.get('/api/admin/users/'));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await api.del(`/api/admin/users/${id}/`);
      notify(res.message);
      load();
    } catch (err) {
      notify(err.message, true);
    }
  }

  if (!ready) return <Shell><p className="text-gray-600">Loading...</p></Shell>;

  return (
    <Shell>
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard - Users and Contributions</h1>

        {msg.text && (
          <div className={`p-3 rounded border ${msg.error ? 'text-red-700 bg-red-100 border-red-700' : 'text-green-700 bg-green-100'}`}>
            {msg.text}
          </div>
        )}
        {error && <p className="text-red-500">Error loading users: {error}</p>}
        {users === null && !error && <p className="text-gray-600">Loading users...</p>}
        {users?.length === 0 && <p>No users found.</p>}

        {users?.map((u) => (
          <div key={u.id} className="bg-white p-4 rounded shadow space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <strong>{u.fname} {u.lname}</strong> ({u.email})
              </div>
              <button
                onClick={() => deleteUser(u.id)}
                className="bg-red-600 hover:bg-red-800 text-white px-3 py-1 rounded"
              >
                Delete User
              </button>
            </div>
            <h3 className="font-semibold">News contributions:</h3>
            {u.contributions.length === 0 && <p className="text-sm text-gray-500">No contributions</p>}
            <div className="space-y-4">
              {u.contributions.map((c) => (
                <ContributionRow key={c.id} c={c} onChanged={load} notify={notify} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}