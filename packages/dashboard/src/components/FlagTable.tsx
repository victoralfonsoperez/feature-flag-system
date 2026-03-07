import type { Flag } from '../types';

type FlagTableProps = {
  flags: Flag[];
  loading: boolean;
};

export default function FlagTable({ flags, loading }: FlagTableProps) {
  if (loading) {
    return <p className="text-gray-500">Loading flags...</p>;
  }

  if (flags.length === 0) {
    return <p className="text-gray-500">No flags found for this environment.</p>;
  }

  return (
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
  );
}
