import type { Environment } from '../types';

type HeaderProps = {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
};

export default function Header({ environment, onEnvironmentChange }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900">Feature Flags</h1>
        <select
          value={environment}
          onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
      </div>
    </header>
  );
}
