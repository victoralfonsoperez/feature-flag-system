import { useContext } from 'react';
import { FlagContext } from './FlagProvider.js';
import type { FlagValues } from './FlagProvider.js';

export function useFlags(): FlagValues {
  return useContext(FlagContext);
}

export function useFlag(key: string, fallback?: string): string | undefined {
  const flags = useFlags();
  return flags[key] ?? fallback;
}
