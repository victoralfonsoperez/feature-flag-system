import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { FlagContext } from '../FlagProvider.js';
import { useFlags, useFlag } from '../useFlags.js';

function wrapper(flags: Record<string, string>) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(FlagContext.Provider, { value: flags }, children);
}

describe('useFlags', () => {
  it('returns all flags from context', () => {
    const flags = { dark_mode: 'true', banner: 'hello' };
    const { result } = renderHook(() => useFlags(), { wrapper: wrapper(flags) });
    expect(result.current).toEqual(flags);
  });

  it('returns empty object when no flags provided', () => {
    const { result } = renderHook(() => useFlags(), { wrapper: wrapper({}) });
    expect(result.current).toEqual({});
  });
});

describe('useFlag', () => {
  it('returns value for existing flag', () => {
    const flags = { dark_mode: 'true' };
    const { result } = renderHook(() => useFlag('dark_mode'), { wrapper: wrapper(flags) });
    expect(result.current).toBe('true');
  });

  it('returns fallback for missing flag', () => {
    const { result } = renderHook(() => useFlag('missing', 'default'), { wrapper: wrapper({}) });
    expect(result.current).toBe('default');
  });

  it('returns undefined for missing flag without fallback', () => {
    const { result } = renderHook(() => useFlag('missing'), { wrapper: wrapper({}) });
    expect(result.current).toBeUndefined();
  });
});
