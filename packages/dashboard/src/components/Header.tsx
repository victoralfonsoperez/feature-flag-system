import { useState } from 'react';
import type { Environment } from '../types';
import { useAuth } from '../auth/AuthContext';

type HeaderProps = {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  appId: string;
  onAppIdChange: (appId: string) => void;
  view: 'flags' | 'tokens' | 'activity';
  onViewChange: (view: 'flags' | 'tokens' | 'activity') => void;
  onOpenSettings?: () => void;
};

export default function Header({ environment, onEnvironmentChange, appId, onAppIdChange, view, onViewChange, onOpenSettings }: HeaderProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [appIdDraft, setAppIdDraft] = useState(appId);

  function commitAppId() {
    const trimmed = appIdDraft.trim() || 'default';
    setAppIdDraft(trimmed);
    if (trimmed !== appId) {
      onAppIdChange(trimmed);
    }
  }

  function navButton(label: string, target: typeof view) {
    return (
      <button
        onClick={() => { onViewChange(target); setMenuOpen(false); }}
        className={`text-sm px-3 py-1 rounded-md ${
          view === target
            ? 'bg-gray-800 text-gray-100 font-medium'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="30" fill="#CA8A04" fillOpacity="0.15" stroke="#EAB308" strokeWidth="2" />
              <path d="M22 38c0-6 4-14 10-16 2-0.7 4 0 5 2 1.5 3 1 7-1 10-2 3-5 5-8 6" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" fill="#EAB308" fillOpacity="0.3" />
              <circle cx="34" cy="26" r="1.5" fill="#EAB308" />
              <path d="M37 24c2-1 4-0.5 5 0.5" stroke="#EAB308" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M28 38c-3 2-6 6-6 10" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" />
              <path d="M32 40c-1 3-1 7 0 10" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h1 className="text-xl font-semibold text-yellow-400">Kanary</h1>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-2">
            {navButton('Flags', 'flags')}
            {navButton('API Tokens', 'tokens')}
            {navButton('Activity', 'activity')}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1">
            <label htmlFor="app-id-input" className="text-xs text-gray-400">App:</label>
            <input
              id="app-id-input"
              type="text"
              value={appIdDraft}
              onChange={(e) => setAppIdDraft(e.target.value)}
              onBlur={commitAppId}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAppId(); }}
              className="w-28 border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </div>
          {view === 'flags' && (
            <select
              value={environment}
              onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
              className="border border-gray-600 rounded-md px-3 py-1.5 text-sm bg-gray-800 text-gray-200"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-gray-400 hover:text-gray-200"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {user && (
            <span className="text-sm text-gray-400">{user.email}</span>
          )}
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-200"
          >
            Logout
          </button>
        </div>
        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-500 hover:text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-700 space-y-2">
          <nav className="flex flex-col gap-1">
            {navButton('Flags', 'flags')}
            {navButton('API Tokens', 'tokens')}
            {navButton('Activity', 'activity')}
          </nav>
          <div className="flex items-center gap-1">
            <label htmlFor="app-id-input-mobile" className="text-xs text-gray-400">App:</label>
            <input
              id="app-id-input-mobile"
              type="text"
              value={appIdDraft}
              onChange={(e) => setAppIdDraft(e.target.value)}
              onBlur={commitAppId}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAppId(); }}
              className="w-full border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </div>
          {view === 'flags' && (
            <select
              value={environment}
              onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
              className="w-full border border-gray-600 rounded-md px-3 py-1.5 text-sm bg-gray-800 text-gray-200"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          )}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              {user && <span className="text-sm text-gray-400">{user.email}</span>}
              {onOpenSettings && (
                <button
                  onClick={() => { onOpenSettings(); setMenuOpen(false); }}
                  className="text-gray-400 hover:text-gray-200"
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
