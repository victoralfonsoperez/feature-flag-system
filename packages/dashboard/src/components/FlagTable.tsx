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
  onRevert?: (flag: Flag) => void;
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-800">
      {Array.from({ length: 6 }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="h-4 bg-gray-700 rounded animate-pulse mb-3 w-2/3" />
      <div className="h-4 bg-gray-700 rounded animate-pulse mb-2 w-1/3" />
      <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2" />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-yellow-500' : 'bg-gray-600'
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

function VariantBadge({ variants }: { variants: string | null }) {
  if (!variants) return null;
  try {
    const parsed = JSON.parse(variants);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300">
        {parsed.length} variant{parsed.length !== 1 ? 's' : ''}
      </span>
    );
  } catch {
    return null;
  }
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
        type === 'build-time'
          ? 'bg-amber-900/40 text-amber-300'
          : 'bg-yellow-900/40 text-yellow-300'
      }`}
    >
      {type}
    </span>
  );
}

function FlagCard({ flag, onToggle, onEdit, onDelete, onViewHistory, onRevert }: {
  flag: Flag;
  onToggle: (flag: Flag, newValue: string) => void;
  onEdit: (flag: Flag) => void;
  onDelete: (flag: Flag) => void;
  onViewHistory: (flagKey: string) => void;
  onRevert?: (flag: Flag) => void;
}) {
  const isBool = flag.value === 'true' || flag.value === 'false';
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-sm font-medium text-gray-100">{flag.key}</span>
        <div className="flex items-center gap-1.5">
          <VariantBadge variants={flag.variants} />
          <TypeBadge type={flag.type} />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2 text-sm">
        <span className="text-gray-400">Value:</span>
        {isBool ? (
          <ToggleSwitch
            checked={flag.value === 'true'}
            onChange={() => onToggle(flag, flag.value === 'true' ? 'false' : 'true')}
          />
        ) : (
          <span className="text-gray-200">{flag.value}</span>
        )}
      </div>
      <div className="text-xs text-gray-400 mb-3">
        {flag.environment} &middot; {flag.updated_at}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onViewHistory(flag.key)} className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700">History</button>
        {onRevert && <button onClick={() => onRevert(flag)} className="text-xs px-2.5 py-1 rounded-md bg-amber-900/40 text-amber-300 hover:bg-amber-900/60">Revert</button>}
        <button onClick={() => onEdit(flag)} className="text-xs px-2.5 py-1 rounded-md bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60">Edit</button>
        <button onClick={() => onDelete(flag)} className="text-xs px-2.5 py-1 rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60">Delete</button>
      </div>
    </div>
  );
}

export default function FlagTable({ flags, loading, error, onRetry, onToggle, onEdit, onDelete, onViewHistory, onRevert }: FlagTableProps) {
  const [buildTimeWarning, setBuildTimeWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggle = useCallback((flag: Flag, newValue: string) => {
    onToggle(flag.key, newValue);
    if (flag.type === 'build-time') {
      setBuildTimeWarning(flag.key);
      setTimeout(() => setBuildTimeWarning(null), 5000);
    }
  }, [onToggle]);

  if (loading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden sm:block w-full bg-gray-900 rounded-lg border border-gray-700" aria-busy="true">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
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
        {/* Mobile skeleton */}
        <div className="sm:hidden space-y-3" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-gray-900 rounded-lg border border-red-800 p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
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
      <div className="w-full bg-gray-900 rounded-lg border border-gray-700 p-12 text-center">
        <p className="text-gray-400 text-lg">No flags found for this environment.</p>
      </div>
    );
  }

  const query = searchQuery.toLowerCase();
  const filteredFlags = query
    ? flags.filter(
        (f) =>
          f.key.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.type.toLowerCase().includes(query),
      )
    : flags;

  return (
    <div>
      <input
        type="text"
        placeholder="Search by key, description, or type..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 mb-3 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
      />
      {buildTimeWarning && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-300 text-sm rounded-md px-3 py-2 mb-3">
          ⚠ Build-time flag &ldquo;{buildTimeWarning}&rdquo; was updated. Changes will take effect after a rebuild.
        </div>
      )}

      {filteredFlags.length === 0 ? (
        <div className="w-full bg-gray-900 rounded-lg border border-gray-700 p-12 text-center">
          <p className="text-gray-400 text-lg">No flags match your search.</p>
        </div>
      ) : (
      <>
      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {filteredFlags.map((flag) => (
          <FlagCard
            key={flag.key}
            flag={flag}
            onToggle={handleToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewHistory={onViewHistory}
            onRevert={onRevert}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <table className="hidden sm:table w-full bg-gray-900 rounded-lg border border-gray-700">
        <thead>
          <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
            <th className="px-4 py-3">Key</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Environment</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {filteredFlags.map((flag) => {
            const isBool = flag.value === 'true' || flag.value === 'false';
            return (
              <tr key={flag.key} className="border-b border-gray-800">
                <td className="px-4 py-3 font-mono text-sm text-gray-200">{flag.key}</td>
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
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={flag.type} />
                    <VariantBadge variants={flag.variants} />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{flag.environment}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{flag.updated_at}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => onViewHistory(flag.key)}
                      className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700"
                    >
                      History
                    </button>
                    {onRevert && (
                      <button
                        onClick={() => onRevert(flag)}
                        className="text-xs px-2.5 py-1 rounded-md bg-amber-900/40 text-amber-300 hover:bg-amber-900/60"
                      >
                        Revert
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(flag)}
                      className="text-xs px-2.5 py-1 rounded-md bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(flag)}
                      className="text-xs px-2.5 py-1 rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </>
      )}
    </div>
  );
}
