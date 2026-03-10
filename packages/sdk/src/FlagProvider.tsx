import { createContext, useEffect, useState, type ReactNode } from 'react';

export type FlagValues = Record<string, string>;

export interface FlagProviderProps {
  serviceUrl: string;
  environment?: string;
  userId?: string;
  defaults?: FlagValues;
  /** Cache TTL in seconds. Set to 0 to disable caching. Default: 0 (disabled). */
  cacheTtl?: number;
  children: ReactNode;
}

export const FlagContext = createContext<FlagValues>({});

const CACHE_KEY_PREFIX = 'ff-sdk-cache';

interface CacheEntry {
  flags: FlagValues;
  timestamp: number;
}

function buildCacheKey(serviceUrl: string, environment: string, userId?: string): string {
  const parts = [CACHE_KEY_PREFIX, serviceUrl, environment];
  if (userId) parts.push(userId);
  return parts.join(':');
}

function readCache(key: string, ttl: number): FlagValues | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl * 1000) return null;
    return entry.flags;
  } catch {
    return null;
  }
}

function writeCache(key: string, flags: FlagValues): void {
  try {
    const entry: CacheEntry = { flags, timestamp: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

export function FlagProvider({
  serviceUrl,
  environment = 'production',
  userId,
  defaults = {},
  cacheTtl = 0,
  children,
}: FlagProviderProps) {
  const cacheKey = buildCacheKey(serviceUrl, environment, userId);
  const cached = cacheTtl > 0 ? readCache(cacheKey, cacheTtl) : null;

  const [flags, setFlags] = useState<FlagValues>(cached ? { ...defaults, ...cached } : defaults);
  const [ready, setReady] = useState(!!cached);

  useEffect(() => {
    const params = new URLSearchParams({
      type: 'runtime',
      env: environment,
    });
    if (userId) params.set('user_id', userId);

    fetch(`${serviceUrl}/api/flags/resolve?${params}`)
      .then((res) => res.json())
      .then((data: FlagValues) => {
        const merged = { ...defaults, ...data };
        setFlags(merged);
        setReady(true);
        if (cacheTtl > 0) writeCache(cacheKey, data);
      })
      .catch(() => {
        if (!cached) {
          setFlags(defaults);
        }
        setReady(true);
      });
  }, [serviceUrl, environment, userId]);

  if (!ready) return null;

  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}
