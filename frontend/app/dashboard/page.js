'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

function ContributionCard({ item, onChanged, notify }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);

  async function save() {
    if (!title.trim() || !content.trim()) {
      notify('Title and content cannot be empty.', true);
      return;
    }
    try {
      const res = await api.put(`/api/contributions/${item.id}/`, { title: title.trim(), content: content.trim() });
      notify(res.message);
      setEditing(false);
      onChanged();
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function remove() {
    if (!confirm('Delete this contribution?')) return;
    try {
      const res = await api.del(`/api/contributions/${item.id}/`);
      notify(res.message);
      onChanged();
    } catch (err) {
      notify(err.message, true);
    }
  }

  return (
    <div className="border p-5 rounded-xl bg-gray-50 shadow relative text-left">
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
          item.is_approved ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
        }`}
      >
        {item.is_approved ? 'Approved' : 'Pending'}
      </span>
      <small className="absolute top-3 right-4 text-gray-500">{new Date(item.created_at).toLocaleString()}</small>

      <input
        value={title} disabled={!editing} onChange={(e) => setTitle(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3 font-semibold disabled:bg-gray-100"
      />
      <textarea
        rows={4} value={content} disabled={!editing} onChange={(e) => setContent(e.target.value)}
        className="w-full border rounded p-3 resize-y disabled:bg-gray-100"
      />

      <div className="mt-3 flex gap-3 justify-end">
        {editing ? (
          <>
            <button onClick={save} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Save</button>
            <button
              onClick={() => { setEditing(false); setTitle(item.title); setContent(item.content); }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm">Edit</button>
        )}
        <button onClick={remove} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">Delete</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, ready } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState({ text: '', error: false });

  const notify = useCallback((text, error = false) => {
    setMsg({ text, error });
    setTimeout(() => setMsg({ text: '', error: false }), 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      setList(await api.get('/api/contributions/'));
    } catch (err) {
      notify(err.message, true);
    }
  }, [notify]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      notify('Please provide both a title and content.', true);
      return;
    }
    try {
      const res = await api.post('/api/contributions/', { title: title.trim(), content: content.trim() });
      notify(res.message || 'Contribution submitted!');
      setTitle('');
      setContent('');
      load();
    } catch (err) {
      notify(err.message, true);
    }
  }

  if (!ready) return <Shell><p className="text-gray-600">Loading...</p></Shell>;

  return (
    <Shell>
      <div className="w-full max-w-3xl space-y-8">
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Welcome back, {user.first_name || user.email}!</h2>
          <h3 className="text-xl font-semibold mb-2">Write new news contribution</h3>

          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter news title"
            className="w-full p-3 border border-gray-300 rounded-md mb-3 text-lg"
          />
          <textarea
            rows={5} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Write your news content here..."
            className="w-full p-3 border border-gray-300 rounded-md resize-y text-lg"
          />
          <button
            type="submit"
            className="w-52 h-12 rounded-2xl bg-blue-950 text-white font-semibold hover:bg-blue-800 transition-colors mt-4"
          >
            Submit Contribution
          </button>

          {msg.text && (
            <div
              role="alert"
              className={`mt-4 p-3 rounded border ${
                msg.error ? 'text-red-700 bg-red-100 border-red-700' : 'text-green-700 bg-green-100'
              }`}
            >
              {msg.text}
            </div>
          )}
        </form>

        <section>
          <h3 className="text-2xl font-semibold mb-4">Your contributions</h3>
          <div className="space-y-5">
            {list === null && <p className="text-gray-600">Loading...</p>}
            {list?.length === 0 && <p className="text-gray-600">You have not added any contributions yet.</p>}
            {list?.map((c) => (
              <ContributionCard key={c.id} item={c} onChanged={load} notify={notify} />
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}