import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { FlagProvider, FlagContext } from '../FlagProvider.js';
import { useContext } from 'react';

function FlagDisplay() {
  const flags = useContext(FlagContext);
  return createElement('pre', { 'data-testid': 'flags' }, JSON.stringify(flags));
}

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown) {
  return Promise.resolve({
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  sessionStorage.clear();
});

afterEach(cleanup);

describe('FlagProvider caching', () => {
  it('fetches flags from API when no cache exists', async () => {
    mockFetch.mockReturnValue(jsonResponse({ dark_mode: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(screen.getByTestId('flags').textContent).toBe(
      JSON.stringify({ dark_mode: 'true' }),
    );
  });

  it('writes fetched flags to sessionStorage', async () => {
    mockFetch.mockReturnValue(jsonResponse({ banner: 'hello' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    const cacheKey = 'ff-sdk-cache:http://localhost:3100:production';
    const cached = JSON.parse(sessionStorage.getItem(cacheKey)!);
    expect(cached.flags).toEqual({ banner: 'hello' });
    expect(cached.timestamp).toBeGreaterThan(0);
  });

  it('uses cached flags immediately on mount (cache hit)', async () => {
    const cacheKey = 'ff-sdk-cache:http://localhost:3100:production';
    sessionStorage.setItem(cacheKey, JSON.stringify({
      flags: { cached_flag: 'yes' },
      timestamp: Date.now(),
    }));

    // Fetch resolves later with updated data
    mockFetch.mockReturnValue(jsonResponse({ cached_flag: 'updated' }));

    // On initial render, cached values should be available immediately (ready=true)
    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    // Fetch still fires in the background (stale-while-revalidate)
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('updates flags after background re-fetch on cache hit', async () => {
    const cacheKey = 'ff-sdk-cache:http://localhost:3100:production';
    sessionStorage.setItem(cacheKey, JSON.stringify({
      flags: { flag: 'old' },
      timestamp: Date.now(),
    }));

    mockFetch.mockReturnValue(jsonResponse({ flag: 'new' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    // After fetch resolves, flags should be updated
    expect(screen.getByTestId('flags').textContent).toBe(
      JSON.stringify({ flag: 'new' }),
    );
  });

  it('treats expired cache as a miss', async () => {
    const cacheKey = 'ff-sdk-cache:http://localhost:3100:production';
    sessionStorage.setItem(cacheKey, JSON.stringify({
      flags: { expired: 'true' },
      timestamp: Date.now() - 120_000, // 2 minutes ago
    }));

    mockFetch.mockReturnValue(jsonResponse({ fresh: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 60, // 60 second TTL — cache is expired
        }, createElement(FlagDisplay)),
      );
    });

    // Should not use expired cache, should use fetched data
    expect(screen.getByTestId('flags').textContent).toBe(
      JSON.stringify({ fresh: 'true' }),
    );
  });

  it('does not cache when cacheTtl is 0', async () => {
    mockFetch.mockReturnValue(jsonResponse({ no_cache: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 0,
        }, createElement(FlagDisplay)),
      );
    });

    expect(sessionStorage.length).toBe(0);
  });

  it('does not cache when cacheTtl is not set', async () => {
    mockFetch.mockReturnValue(jsonResponse({ no_cache: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
        }, createElement(FlagDisplay)),
      );
    });

    expect(sessionStorage.length).toBe(0);
  });

  it('uses separate cache keys per environment', async () => {
    mockFetch.mockReturnValue(jsonResponse({ env_flag: 'staging' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          environment: 'staging',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    const stagingKey = 'ff-sdk-cache:http://localhost:3100:staging';
    const prodKey = 'ff-sdk-cache:http://localhost:3100:production';
    expect(sessionStorage.getItem(stagingKey)).not.toBeNull();
    expect(sessionStorage.getItem(prodKey)).toBeNull();
  });

  it('uses separate cache keys per userId', async () => {
    mockFetch.mockReturnValue(jsonResponse({ user_flag: 'a' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          userId: 'user-123',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    const userKey = 'ff-sdk-cache:http://localhost:3100:production:user-123';
    expect(sessionStorage.getItem(userKey)).not.toBeNull();
  });

  it('falls back to defaults on fetch error with no cache', async () => {
    mockFetch.mockReturnValue(Promise.reject(new Error('Network error')));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          defaults: { fallback: 'yes' },
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    expect(screen.getByTestId('flags').textContent).toBe(
      JSON.stringify({ fallback: 'yes' }),
    );
  });

  it('fires onVariantAssigned for each variant when userId is set', async () => {
    const onVariantAssigned = vi.fn();
    mockFetch.mockReturnValue(jsonResponse({
      button_color: 'blue',
      _variants: {
        button_color: { variant: 'blue-variant', flagKey: 'button_color' },
      },
    }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          userId: 'user-42',
          onVariantAssigned,
        }, createElement(FlagDisplay)),
      );
    });

    expect(onVariantAssigned).toHaveBeenCalledOnce();
    expect(onVariantAssigned).toHaveBeenCalledWith('button_color', 'blue-variant', 'user-42');
  });

  it('fires onVariantAssigned for multiple variants', async () => {
    const onVariantAssigned = vi.fn();
    mockFetch.mockReturnValue(jsonResponse({
      button_color: 'blue',
      header_text: 'Welcome!',
      _variants: {
        button_color: { variant: 'blue-variant', flagKey: 'button_color' },
        header_text: { variant: 'greeting-a', flagKey: 'header_text' },
      },
    }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          userId: 'user-42',
          onVariantAssigned,
        }, createElement(FlagDisplay)),
      );
    });

    expect(onVariantAssigned).toHaveBeenCalledTimes(2);
    expect(onVariantAssigned).toHaveBeenCalledWith('button_color', 'blue-variant', 'user-42');
    expect(onVariantAssigned).toHaveBeenCalledWith('header_text', 'greeting-a', 'user-42');
  });

  it('does not fire onVariantAssigned when no variants in response', async () => {
    const onVariantAssigned = vi.fn();
    mockFetch.mockReturnValue(jsonResponse({
      dark_mode: 'true',
      _variants: {},
    }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          userId: 'user-42',
          onVariantAssigned,
        }, createElement(FlagDisplay)),
      );
    });

    expect(onVariantAssigned).not.toHaveBeenCalled();
  });

  it('does not fire onVariantAssigned when userId is not set', async () => {
    const onVariantAssigned = vi.fn();
    mockFetch.mockReturnValue(jsonResponse({
      dark_mode: 'true',
      _variants: {},
    }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          onVariantAssigned,
        }, createElement(FlagDisplay)),
      );
    });

    expect(onVariantAssigned).not.toHaveBeenCalled();
  });

  it('does not include _variants key in resolved flags', async () => {
    mockFetch.mockReturnValue(jsonResponse({
      button_color: 'blue',
      _variants: {
        button_color: { variant: 'blue-variant', flagKey: 'button_color' },
      },
    }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          userId: 'user-42',
        }, createElement(FlagDisplay)),
      );
    });

    expect(screen.getByTestId('flags').textContent).toBe(
      JSON.stringify({ button_color: 'blue' }),
    );
  });

  it('passes appId as query param in fetch URL', async () => {
    mockFetch.mockReturnValue(jsonResponse({ dark_mode: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          appId: 'my-app',
        }, createElement(FlagDisplay)),
      );
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('app_id=my-app');
  });

  it('uses separate cache keys per appId', async () => {
    mockFetch.mockReturnValue(jsonResponse({ flag: 'val' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          appId: 'app-x',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    const appKey = 'ff-sdk-cache:http://localhost:3100:production:app:app-x';
    expect(sessionStorage.getItem(appKey)).not.toBeNull();
    // Default key should not exist
    const defaultKey = 'ff-sdk-cache:http://localhost:3100:production';
    expect(sessionStorage.getItem(defaultKey)).toBeNull();
  });

  it('passes apiKey as Authorization header in fetch', async () => {
    mockFetch.mockReturnValue(jsonResponse({ dark_mode: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          apiKey: 'my-secret-token',
        }, createElement(FlagDisplay)),
      );
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect((fetchOptions.headers as Record<string, string>).Authorization).toBe('Bearer my-secret-token');
  });

  it('does not send Authorization header when apiKey is not set', async () => {
    mockFetch.mockReturnValue(jsonResponse({ dark_mode: 'true' }));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
        }, createElement(FlagDisplay)),
      );
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.headers).toBeUndefined();
  });

  it('keeps cached values on fetch error when cache exists', async () => {
    const cacheKey = 'ff-sdk-cache:http://localhost:3100:production';
    sessionStorage.setItem(cacheKey, JSON.stringify({
      flags: { cached: 'value' },
      timestamp: Date.now(),
    }));

    mockFetch.mockReturnValue(Promise.reject(new Error('Network error')));

    await act(async () => {
      render(
        createElement(FlagProvider, {
          serviceUrl: 'http://localhost:3100',
          cacheTtl: 60,
        }, createElement(FlagDisplay)),
      );
    });

    // Should keep the cached values, not revert to empty defaults
    expect(screen.getByTestId('flags').textContent).toBe(
      JSON.stringify({ cached: 'value' }),
    );
  });
});
