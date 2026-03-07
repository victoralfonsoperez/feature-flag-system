import type { Environment } from '../types';
import { useAuth } from '../auth/AuthContext';

type HeaderProps = {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  view: 'flags' | 'tokens';
  onViewChange: (view: 'flags' | 'tokens') => void;
};

export default function Header({ environment, onEnvironmentChange, view, onViewChange }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-gray-900">Feature Flags</h1>
          <nav className="flex gap-2">
            <button
              onClick={() => onViewChange('flags')}
              className={`text-sm px-3 py-1 rounded-md ${
                view === 'flags'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Flags
            </button>
            <button
              onClick={() => onViewChange('tokens')}
              className={`text-sm px-3 py-1 rounded-md ${
                view === 'tokens'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              API Tokens
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {view === 'flags' && (
            <select
              value={environment}
              onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          )}
          {user && (
            <span className="text-sm text-gray-500">{user.email}</span>
          )}
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
