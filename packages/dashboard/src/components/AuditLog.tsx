import { useState, useEffect } from 'react';
import { getAuditLog } from '../api';
import type { AuditLogEntry } from '../types';

type AuditLogProps = {
  flagKey?: string;
};

function ActionBadge({ action }: { action: string }) {
  const colors =
    action === 'created'
      ? 'bg-green-100 text-green-800'
      : action === 'updated'
        ? 'bg-blue-100 text-blue-800'
        : action === 'deleted'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-800';

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors}`}>
      {action}
    </span>
  );
}

export default function AuditLog({ flagKey }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getAuditLog(flagKey)
      .then((data) => setEntries(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [flagKey]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Activity Log{flagKey ? `: ${flagKey}` : ''}
      </h2>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading activity log...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No activity recorded yet.</p>
      ) : (
        <table className="w-full bg-white rounded-lg border border-gray-200">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Flag Key</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Old Value</th>
              <th className="px-4 py-3">New Value</th>
              <th className="px-4 py-3">Changed By</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-mono text-sm">{entry.flag_key}</td>
                <td className="px-4 py-3">
                  <ActionBadge action={entry.action} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{entry.old_value ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{entry.new_value ?? '—'}</td>
                <td className="px-4 py-3 text-sm">{entry.changed_by}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{entry.changed_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
