import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getTokens, createToken, deleteToken } from '../api';
import { useToast } from './Toast';

type Token = { id: number; name: string; created_at: string; last_used_at: string | null };

export default function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

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
      showToast('Token created', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create token';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Revoke this token? This cannot be undone.')) return;
    try {
      await deleteToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
      showToast('Token revoked', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete token';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">API Tokens</h2>

      <form onSubmit={handleCreate} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Token name (e.g. CI pipeline)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Create Token
        </button>
      </form>

      {newToken && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-md">
          <p className="text-sm font-medium text-green-300 mb-2">
            Token created. Copy it now — it won't be shown again.
          </p>
          <code className="block p-2 bg-gray-800 border border-green-700 rounded text-sm font-mono break-all select-all text-green-200">
            {newToken}
          </code>
          <button
            onClick={() => setNewToken(null)}
            className="mt-2 text-xs px-2.5 py-1 rounded-md bg-green-900/40 text-green-300 hover:bg-green-900/60"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading tokens...</p>
      ) : tokens.length === 0 ? (
        <p className="text-gray-400 text-sm">No API tokens yet.</p>
      ) : (
        <table className="w-full bg-gray-900 rounded-lg border border-gray-700">
          <thead>
            <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Last Used</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id} className="border-b border-gray-800">
                <td className="px-4 py-3 text-sm font-medium text-gray-200">{token.name}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{token.created_at}</td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {token.last_used_at ?? 'Never'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(token.id)}
                    className="text-xs px-2.5 py-1 rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60"
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
