import { useState, useCallback } from 'react';
import type { Flag } from '../types';

type FlagTableProps = {
  flags: Flag[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggle: (key: string, newValue: string) => void;
  onEdit: (flag: Flag) => void;
  onDelete: (flag: Flag) => void;
  onViewHistory: (flagKey: string) => void;
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: 6 }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function FlagTable({ flags, loading, error, onRetry, onToggle, onEdit, onDelete, onViewHistory }: FlagTableProps) {
  const [buildTimeWarning, setBuildTimeWarning] = useState<string | null>(null);

  const handleToggle = useCallback((flag: Flag, newValue: string) => {
    onToggle(flag.key, newValue);
    if (flag.type === 'build-time') {
      setBuildTimeWarning(flag.key);
      setTimeout(() => setBuildTimeWarning(null), 5000);
    }
  }, [onToggle]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg border border-gray-200" aria-busy="true">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Environment</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg border border-red-200 p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg">No flags found for this environment.</p>
      </div>
    );
  }

  return (
    <div>
      {buildTimeWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2 mb-3">
          ⚠ Build-time flag &ldquo;{buildTimeWarning}&rdquo; was updated. Changes will take effect after a rebuild.
        </div>
      )}
    <table className="w-full bg-white rounded-lg border border-gray-200">
      <thead>
        <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
          <th className="px-4 py-3">Key</th>
          <th className="px-4 py-3">Value</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Environment</th>
          <th className="px-4 py-3">Updated</th>
        </tr>
      </thead>
      <tbody>
        {flags.map((flag) => {
          const isBool = flag.value === 'true' || flag.value === 'false';
          return (
            <tr key={flag.key} className="border-b border-gray-100">
              <td className="px-4 py-3 font-mono text-sm">{flag.key}</td>
              <td className="px-4 py-3 text-sm">
                {isBool ? (
                  <ToggleSwitch
                    checked={flag.value === 'true'}
                    onChange={() => handleToggle(flag, flag.value === 'true' ? 'false' : 'true')}
                  />
                ) : (
                  flag.value
                )}
              </td>
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
              <td className="px-4 py-3 text-sm">{flag.environment}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{flag.updated_at}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onViewHistory(flag.key)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  History
                </button>
                <button
                  onClick={() => onEdit(flag)}
                  className="text-sm text-blue-600 hover:underline ml-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(flag)}
                  className="text-sm text-red-600 hover:underline ml-3"
                >
                  Delete
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
