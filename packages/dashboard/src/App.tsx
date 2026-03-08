import { useEffect, useState } from 'react';
import { getFlags, getAuthStatus } from './api';
import type { Flag, Environment } from './types';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Header from './components/Header';
import FlagTable from './components/FlagTable';
import LoginForm from './components/LoginForm';
import SetupForm from './components/SetupForm';
import TokenManager from './components/TokenManager';

function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environment, setEnvironment] = useState<Environment>('production');
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [view, setView] = useState<'flags' | 'tokens'>('flags');

  useEffect(() => {
    getAuthStatus()
      .then((data) => setSetupRequired(data.setupRequired))
      .catch(() => setSetupRequired(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getFlags(environment)
      .then((data) => setFlags(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [environment, isAuthenticated]);

  if (isLoading || setupRequired === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Loading...</p></div>;
  }

  if (setupRequired) return <SetupForm />;
  if (!isAuthenticated) return <LoginForm />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        environment={environment}
        onEnvironmentChange={setEnvironment}
        view={view}
        onViewChange={setView}
      />
      <main className="max-w-6xl mx-auto p-6">
        {view === 'flags' ? (
          <FlagTable flags={flags} loading={loading} />
        ) : (
          <TokenManager />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
