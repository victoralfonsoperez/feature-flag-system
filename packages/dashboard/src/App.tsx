import { useEffect, useState } from 'react';
import { getFlags, updateFlag, createFlag, deleteFlag, getAuditLog } from './api';
import type { Flag, Environment, CreateFlagInput, UpdateFlagInput } from './types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import Header from './components/Header';
import FlagTable from './components/FlagTable';
import CreateFlagForm from './components/CreateFlagForm';
import EditFlagModal from './components/EditFlagModal';
import DeleteFlagModal from './components/DeleteFlagModal';
import TokenManager from './components/TokenManager';
import AuditLog from './components/AuditLog';
import SettingsModal from './components/SettingsModal';

const APP_ID_STORAGE_KEY = 'ff-dashboard-app-id';

function Dashboard() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { showToast } = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environment, setEnvironment] = useState<Environment>('production');
  const [appId, setAppId] = useState<string>(() => localStorage.getItem(APP_ID_STORAGE_KEY) ?? 'default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'flags' | 'tokens' | 'activity'>('flags');
  const [editingFlag, setEditingFlag] = useState<Flag | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<Flag | null>(null);
  const [activityFlagKey, setActivityFlagKey] = useState<string | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleAppIdChange(newAppId: string) {
    setAppId(newAppId);
    localStorage.setItem(APP_ID_STORAGE_KEY, newAppId);
  }

  function handleViewHistory(flagKey: string) {
    setActivityFlagKey(flagKey);
    setView('activity');
  }

  function handleViewChange(newView: 'flags' | 'tokens' | 'activity') {
    if (newView !== 'activity') {
      setActivityFlagKey(undefined);
    }
    setView(newView);
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    getFlags(environment, appId)
      .then((data) => setFlags(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [environment, appId, isAuthenticated]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    getFlags(environment, appId)
      .then((data) => setFlags(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function handleToggle(key: string, newValue: string) {
    updateFlag(key, { value: newValue }, appId).then((updated) => {
      setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
    });
  }

  async function handleCreateFlag(input: CreateFlagInput) {
    await createFlag({ ...input, app_id: appId });
    const data = await getFlags(environment, appId);
    setFlags(data);
    showToast(`Flag "${input.key}" created`, 'success');
  }

  async function handleEditFlag(key: string, input: UpdateFlagInput) {
    const updated = await updateFlag(key, input, appId);
    setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
    showToast(`Flag "${key}" updated`, 'success');
  }

  async function handleDeleteFlag(key: string) {
    await deleteFlag(key, appId);
    setFlags((prev) => prev.filter((f) => f.key !== key));
    showToast(`Flag "${key}" deleted`, 'success');
  }

  async function handleRevertFlag(flag: Flag) {
    try {
      const entries = await getAuditLog(flag.key, appId);
      const prev = entries.find(
        (e) => e.action === 'updated' && e.old_value !== null && e.old_value !== flag.value,
      );
      if (!prev) {
        showToast('No previous value to revert to', 'info');
        return;
      }
      const updated = await updateFlag(flag.key, { value: prev.old_value! }, appId);
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? updated : f)));
      showToast(`Flag "${flag.key}" reverted to "${prev.old_value}"`, 'success');
    } catch (e) {
      showToast(`Failed to revert flag: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><p className="text-gray-400">Loading...</p></div>;
  }

  if (!isAuthenticated) {
    login();
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><p className="text-gray-400">Redirecting to login...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        environment={environment}
        onEnvironmentChange={setEnvironment}
        appId={appId}
        onAppIdChange={handleAppIdChange}
        view={view}
        onViewChange={handleViewChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {view === 'flags' ? (
          <>
            <CreateFlagForm onSubmit={handleCreateFlag} />
            <FlagTable flags={flags} loading={loading} error={error} onRetry={handleRetry} onToggle={handleToggle} onEdit={setEditingFlag} onDelete={setDeletingFlag} onViewHistory={handleViewHistory} onRevert={handleRevertFlag} />
            {editingFlag && (
              <EditFlagModal
                flag={editingFlag}
                onSave={handleEditFlag}
                onClose={() => setEditingFlag(null)}
              />
            )}
            {deletingFlag && (
              <DeleteFlagModal
                flag={deletingFlag}
                onConfirm={handleDeleteFlag}
                onClose={() => setDeletingFlag(null)}
              />
            )}
          </>
        ) : view === 'tokens' ? (
          <TokenManager />
        ) : (
          <AuditLog flagKey={activityFlagKey} appId={appId} />
        )}
      </main>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </AuthProvider>
  );
}
