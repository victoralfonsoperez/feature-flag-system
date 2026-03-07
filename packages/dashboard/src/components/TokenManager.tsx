import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getTokens, createToken, deleteToken } from '../api';

type Token = { id: number; name: string; created_at: string; last_used_at: string | null };

export default function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    try {
      const data = await getTokens();
      setTokens(data);
    } catch {
      setError('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await createToken(name);
      setNewToken(data.token);
      setName('');
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Revoke this token? This cannot be undone.')) return;
    try {
      await deleteToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete token');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">API Tokens</h2>

      <form onSubmit={handleCreate} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Token name (e.g. CI pipeline)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Create Token
        </button>
      </form>

      {newToken && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800 mb-2">
            Token created. Copy it now — it won't be shown again.
          </p>
          <code className="block p-2 bg-white border border-green-300 rounded text-sm font-mono break-all select-all">
            {newToken}
          </code>
          <button
            onClick={() => setNewToken(null)}
            className="mt-2 text-sm text-green-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading tokens...</p>
      ) : tokens.length === 0 ? (
        <p className="text-gray-500 text-sm">No API tokens yet.</p>
      ) : (
        <table className="w-full bg-white rounded-lg border border-gray-200">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Last Used</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm font-medium">{token.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{token.created_at}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {token.last_used_at ?? 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(token.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
