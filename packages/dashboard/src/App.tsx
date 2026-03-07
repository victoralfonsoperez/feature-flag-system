import { useEffect, useState } from 'react';
import { getFlags } from './api';
import type { Flag, Environment } from './types';
import Header from './components/Header';
import FlagTable from './components/FlagTable';

export default function App() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environment, setEnvironment] = useState<Environment>('production');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getFlags(environment)
      .then((data) => setFlags(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [environment]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header environment={environment} onEnvironmentChange={setEnvironment} />
      <main className="max-w-6xl mx-auto p-6">
        <FlagTable flags={flags} loading={loading} />
      </main>
    </div>
  );
}
