import { createContext, useEffect, useState, type ReactNode } from 'react';

export type FlagValues = Record<string, string>;

export type OnVariantAssigned = (flagKey: string, variantName: string, userId: string) => void;

export interface FlagProviderProps {
  serviceUrl: string;
  environment?: string;
  userId?: string;
  /** App ID for multi-app scoping. Defaults to 'default'. */
  appId?: string;
  defaults?: FlagValues;
  /** Cache TTL in seconds. Set to 0 to disable caching. Default: 0 (disabled). */
  cacheTtl?: number;
  /** Called when a flag with variants is resolved for a user. */
  onVariantAssigned?: OnVariantAssigned;
  children: ReactNode;
}

export const FlagContext = createContext<FlagValues>({});

const CACHE_KEY_PREFIX = 'ff-sdk-cache';

interface CacheEntry {
  flags: FlagValues;
  timestamp: number;
}

function buildCacheKey(serviceUrl: string, environment: string, userId?: string, appId?: string): string {
  const parts = [CACHE_KEY_PREFIX, serviceUrl, environment];
  if (appId && appId !== 'default') parts.push(`app:${appId}`);
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
  appId,
  defaults = {},
  cacheTtl = 0,
  onVariantAssigned,
  children,
}: FlagProviderProps) {
  const cacheKey = buildCacheKey(serviceUrl, environment, userId, appId);
  const cached = cacheTtl > 0 ? readCache(cacheKey, cacheTtl) : null;

  const [flags, setFlags] = useState<FlagValues>(cached ? { ...defaults, ...cached } : defaults);
  const [ready, setReady] = useState(!!cached);

  useEffect(() => {
    const params = new URLSearchParams({
      type: 'runtime',
      env: environment,
    });
    if (userId) params.set('user_id', userId);
    if (appId) params.set('app_id', appId);

    fetch(`${serviceUrl}/api/flags/resolve?${params}`)
      .then((res) => res.json())
      .then((data: Record<string, unknown>) => {
        const variantsMeta = data._variants as Record<string, { variant: string; flagKey: string }> | undefined;
        const flagValues: FlagValues = {};
        for (const [k, v] of Object.entries(data)) {
          if (k !== '_variants') flagValues[k] = v as string;
        }

        const merged = { ...defaults, ...flagValues };
        setFlags(merged);
        setReady(true);
        if (cacheTtl > 0) writeCache(cacheKey, flagValues);

        if (onVariantAssigned && userId && variantsMeta) {
          for (const [flagKey, meta] of Object.entries(variantsMeta)) {
            onVariantAssigned(flagKey, meta.variant, userId);
          }
        }
      })
      .catch(() => {
        if (!cached) {
          setFlags(defaults);
        }
        setReady(true);
      });
  }, [serviceUrl, environment, userId, appId]);

  if (!ready) return null;

  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}
