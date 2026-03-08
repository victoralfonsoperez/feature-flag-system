import type { Flag, Environment, CreateFlagInput, UpdateFlagInput } from './types';

export type { Flag, Environment, CreateFlagInput, UpdateFlagInput };

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Retry wrapper: on 401, attempt a token refresh then replay the original request. */
async function authedRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // Try refreshing the access token
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        // Retry the original request with the new cookie
        return request<T>(path, options);
      }
    }
    throw err;
  }
}

// Auth

export function getAuthStatus(): Promise<{ setupRequired: boolean }> {
  return request('/auth/status');
}

export function setup(email: string, password: string): Promise<{ user: { id: number; email: string; role: string } }> {
  return request('/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string): Promise<{ user: { id: number; email: string; role: string } }> {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<{ user: { id: number; email: string; role: string } }> {
  return authedRequest('/auth/me');
}

// Tokens

export function getTokens(): Promise<{ id: number; name: string; created_at: string; last_used_at: string | null }[]> {
  return authedRequest('/tokens');
}

export function createToken(name: string): Promise<{ id: number; name: string; token: string }> {
  return authedRequest('/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function deleteToken(id: number): Promise<void> {
  return authedRequest(`/tokens/${id}`, { method: 'DELETE' });
}

// Flags

export function getFlags(env?: Environment): Promise<Flag[]> {
  const query = env ? `?env=${env}` : '';
  return request<Flag[]>(`/flags${query}`);
}

export function getFlag(key: string): Promise<Flag> {
  return request<Flag>(`/flags/${encodeURIComponent(key)}`);
}

export function createFlag(input: CreateFlagInput): Promise<Flag> {
  return authedRequest<Flag>('/flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateFlag(key: string, input: UpdateFlagInput): Promise<Flag> {
  return authedRequest<Flag>(`/flags/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function deleteFlag(key: string): Promise<void> {
  return authedRequest<void>(`/flags/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}
