import { useEffect, useState } from 'react';
import { getFlags, type Flag, type Environment } from './api';

export default function App() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environment, setEnvironment] = useState<Environment>('production');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFlags(environment)
      .then((data) => setFlags(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [environment]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">Feature Flags</h1>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {loading ? (
          <p className="text-gray-500">Loading flags...</p>
        ) : flags.length === 0 ? (
          <p className="text-gray-500">No flags found for this environment.</p>
        ) : (
          <table className="w-full bg-white rounded-lg border border-gray-200">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.key} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-mono text-sm">{flag.key}</td>
                  <td className="px-4 py-3 text-sm">{flag.value}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        flag.type === 'build-time'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {flag.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{flag.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
