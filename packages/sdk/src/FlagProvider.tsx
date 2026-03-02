import { createContext, useEffect, useState, type ReactNode } from 'react';

export type FlagValues = Record<string, string>;

export interface FlagProviderProps {
  serviceUrl: string;
  environment?: string;
  userId?: string;
  defaults?: FlagValues;
  children: ReactNode;
}

export const FlagContext = createContext<FlagValues>({});

export function FlagProvider({
  serviceUrl,
  environment = 'production',
  userId,
  defaults = {},
  children,
}: FlagProviderProps) {
  const [flags, setFlags] = useState<FlagValues>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({
      type: 'runtime',
      env: environment,
    });
    if (userId) params.set('user_id', userId);

    fetch(`${serviceUrl}/api/flags/resolve?${params}`)
      .then((res) => res.json())
      .then((data: FlagValues) => {
        setFlags({ ...defaults, ...data });
        setReady(true);
      })
      .catch(() => {
        setFlags(defaults);
        setReady(true);
      });
  }, [serviceUrl, environment, userId]);

  if (!ready) return null;

  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}
