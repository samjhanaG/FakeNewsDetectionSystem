'use client';

import { useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/lib/api';

const METHODS = [
  { value: 'text', label: 'Article text' },
  { value: 'url', label: 'News URL' },
  { value: 'dataset', label: 'From dataset' },
];

const isFake = (s) => (s || '').toLowerCase().includes('fake');

export default function Home() {
  const [method, setMethod] = useState('text');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setData(null);
    if (!input.trim()) {
      setError('Please enter some text, a URL or a keyword.');
      return;
    }
    setLoading(true);
    try {
      setData(await api.post('/api/analyze/', { user_input: input.trim(), method }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8">
        <h2 className="uppercase text-2xl font-bold text-center mb-6">Choose a method</h2>

        <div className="flex justify-center gap-6 mb-6 flex-wrap">
          {METHODS.map((m) => (
            <label key={m.value} className="inline-flex items-center gap-2 text-lg text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="method"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                className="h-5 w-5"
              />
              {m.label}
            </label>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {method === 'text' ? (
            <textarea
              rows={8}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste the news article here..."
              className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={method === 'url' ? 'Paste a news URL...' : 'Enter a keyword or headline...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="w-40 h-12 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Checking...' : 'Check News'}
            </button>
          </div>
        </form>

        {error && <p className="text-red-600 text-center mt-4 text-sm">{error}</p>}

        {data && (
          <div className="mt-6 space-y-4">
            <div className="border border-gray-300 p-4 rounded-xl bg-white shadow-sm">
              {data.article_text && (
                <>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Article</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {data.article_text.length > 600 ? `${data.article_text.slice(0, 600)}...` : data.article_text}
                  </p>
                </>
              )}
              {data.result && (
                <h2 className={`text-lg font-bold mt-3 ${isFake(data.result) ? 'text-red-600' : 'text-green-600'}`}>
                  Prediction: {data.result}
                  {data.confidence ? ` (${data.confidence}% confidence)` : ''}
                </h2>
              )}
            </div>

            {data.articles?.length > 0 && (
              <div>
                <h2 className="font-bold text-xl text-gray-800 mb-2">Dataset results</h2>
                <div className="space-y-3">
                  {data.articles.map((a, i) => (
                    <div key={i} className="border border-gray-300 p-4 rounded-xl bg-white shadow-sm text-sm">
                      <p><strong>Title:</strong> {a.title}</p>
                      <p className="text-gray-700"><strong>Excerpt:</strong> {a.text}</p>
                      <p className="mt-1">
                        <strong>Predicted:</strong>{' '}
                        <span className={isFake(a.predicted) ? 'text-red-600' : 'text-green-600'}>{a.predicted}</span>
                        {' | '}
                        <strong>Actual:</strong>{' '}
                        <span className={isFake(a.actual) ? 'text-red-600' : 'text-green-600'}>{a.actual}</span>
                        {' | '}
                        <span className="text-gray-500">similarity {a.similarity}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}