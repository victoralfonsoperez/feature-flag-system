import { useEffect, useState } from 'react';
import { getFlags, getAuthStatus, updateFlag, createFlag, deleteFlag } from './api';
import type { Flag, Environment, CreateFlagInput, UpdateFlagInput } from './types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import Header from './components/Header';
import FlagTable from './components/FlagTable';
import CreateFlagForm from './components/CreateFlagForm';
import EditFlagModal from './components/EditFlagModal';
import DeleteFlagModal from './components/DeleteFlagModal';
import LoginForm from './components/LoginForm';
import SetupForm from './components/SetupForm';
import TokenManager from './components/TokenManager';
import UserManager from './components/UserManager';
import AuditLog from './components/AuditLog';
import SettingsModal from './components/SettingsModal';

function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environment, setEnvironment] = useState<Environment>('production');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [view, setView] = useState<'flags' | 'tokens' | 'users' | 'activity'>('flags');
  const [editingFlag, setEditingFlag] = useState<Flag | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<Flag | null>(null);
  const [activityFlagKey, setActivityFlagKey] = useState<string | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleViewHistory(flagKey: string) {
    setActivityFlagKey(flagKey);
    setView('activity');
  }

  function handleViewChange(newView: 'flags' | 'tokens' | 'users' | 'activity') {
    if (newView !== 'activity') {
      setActivityFlagKey(undefined);
    }
    setView(newView);
  }

  useEffect(() => {
    getAuthStatus()
      .then((data) => setSetupRequired(data.setupRequired))
      .catch(() => setSetupRequired(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    getFlags(environment)
      .then((data) => setFlags(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [environment, isAuthenticated]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    getFlags(environment)
      .then((data) => setFlags(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function handleToggle(key: string, newValue: string) {
    updateFlag(key, { value: newValue }).then((updated) => {
      setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
    });
  }

  async function handleCreateFlag(input: CreateFlagInput) {
    await createFlag(input);
    const data = await getFlags(environment);
    setFlags(data);
    showToast(`Flag "${input.key}" created`, 'success');
  }

  async function handleEditFlag(key: string, input: UpdateFlagInput) {
    const updated = await updateFlag(key, input);
    setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
    showToast(`Flag "${key}" updated`, 'success');
  }

  async function handleDeleteFlag(key: string) {
    await deleteFlag(key);
    setFlags((prev) => prev.filter((f) => f.key !== key));
    showToast(`Flag "${key}" deleted`, 'success');
  }

  if (isLoading || setupRequired === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><p className="text-gray-400">Loading...</p></div>;
  }

  if (setupRequired) return <SetupForm />;
  if (!isAuthenticated) return <LoginForm />;

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        environment={environment}
        onEnvironmentChange={setEnvironment}
        view={view}
        onViewChange={handleViewChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {view === 'flags' ? (
          <>
            <CreateFlagForm onSubmit={handleCreateFlag} />
            <FlagTable flags={flags} loading={loading} error={error} onRetry={handleRetry} onToggle={handleToggle} onEdit={setEditingFlag} onDelete={setDeletingFlag} onViewHistory={handleViewHistory} />
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
        ) : view === 'activity' ? (
          <AuditLog flagKey={activityFlagKey} />
        ) : (
          <UserManager />
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
