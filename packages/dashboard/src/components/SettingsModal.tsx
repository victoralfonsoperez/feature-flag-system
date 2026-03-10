import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../api';
import type { DashboardSettings } from '../api';
import { useToast } from './Toast';

type SettingsModalProps = {
  onClose: () => void;
};

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const settings = getSettings();
    setApiUrl(settings.apiUrl || '');
    setApiToken(settings.apiToken || '');
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleSave() {
    const settings: DashboardSettings = {};
    if (apiUrl.trim()) settings.apiUrl = apiUrl.trim();
    if (apiToken.trim()) settings.apiToken = apiToken.trim();
    saveSettings(settings);
    showToast('Settings saved', 'success');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="settings-api-url" className="block text-sm font-medium text-gray-700 mb-1">
              API Base URL
            </label>
            <input
              id="settings-api-url"
              type="text"
              placeholder="/api"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Override the default API endpoint. Leave empty to use the default.
            </p>
          </div>
          <div>
            <label htmlFor="settings-api-token" className="block text-sm font-medium text-gray-700 mb-1">
              Bearer Token
            </label>
            <input
              id="settings-api-token"
              type="password"
              placeholder="Enter API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Attach a Bearer token to all API requests. Useful when the dashboard is hosted separately.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
