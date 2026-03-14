import type { Flag, Environment, CreateFlagInput, UpdateFlagInput, AuditLogEntry } from './types';

export type { Flag, Environment, CreateFlagInput, UpdateFlagInput, AuditLogEntry };

const SETTINGS_KEY = 'ff-dashboard-settings';

export type DashboardSettings = {
  apiUrl?: string;
  apiToken?: string;
};

export function getSettings(): DashboardSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (raw.apiToken) {
      raw.apiToken = atob(raw.apiToken);
    }
    return raw;
  } catch {
    return {};
  }
}

export function saveSettings(settings: DashboardSettings): void {
  const toStore = { ...settings };
  if (toStore.apiToken) {
    toStore.apiToken = btoa(toStore.apiToken);
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(toStore));
}

function getBaseUrl(): string {
  const saved = getSettings().apiUrl;
  if (saved) return saved;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env;
  if (env?.VITE_API_URL) {
    return env.VITE_API_URL as string;
  }
  return '/api';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessTokenGetter: (() => Promise<string>) | null = null;

export function setAccessTokenGetter(getter: () => Promise<string>): void {
  accessTokenGetter = getter;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const settings = getSettings();
  const fetchOptions: RequestInit = { ...options };

  // Build auth headers: prefer API token from settings, then Auth0 token
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  if (settings.apiToken) {
    headers.Authorization = `Bearer ${settings.apiToken}`;
  }

  fetchOptions.headers = headers;

  const res = await fetch(`${baseUrl}${path}`, fetchOptions);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function authedRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const settings = getSettings();
  const fetchOptions: RequestInit = { ...options };

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  if (settings.apiToken) {
    headers.Authorization = `Bearer ${settings.apiToken}`;
  } else if (accessTokenGetter) {
    const token = await accessTokenGetter();
    headers.Authorization = `Bearer ${token}`;
  }

  fetchOptions.headers = headers;

  const res = await fetch(`${baseUrl}${path}`, fetchOptions);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth

export function getMe(): Promise<{ user: { id: string; email: string; role: string } }> {
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

export function getFlags(env?: Environment, appId?: string): Promise<Flag[]> {
  const params = new URLSearchParams();
  if (env) params.set('env', env);
  if (appId) params.set('app_id', appId);
  const query = params.toString() ? `?${params}` : '';
  return request<Flag[]>(`/flags${query}`);
}

export function getFlag(key: string, appId?: string): Promise<Flag> {
  const query = appId ? `?app_id=${encodeURIComponent(appId)}` : '';
  return request<Flag>(`/flags/${encodeURIComponent(key)}${query}`);
}

export function createFlag(input: CreateFlagInput): Promise<Flag> {
  return authedRequest<Flag>('/flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateFlag(key: string, input: UpdateFlagInput, appId?: string): Promise<Flag> {
  const query = appId ? `?app_id=${encodeURIComponent(appId)}` : '';
  return authedRequest<Flag>(`/flags/${encodeURIComponent(key)}${query}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function deleteFlag(key: string, appId?: string): Promise<void> {
  const query = appId ? `?app_id=${encodeURIComponent(appId)}` : '';
  return authedRequest<void>(`/flags/${encodeURIComponent(key)}${query}`, {
    method: 'DELETE',
  });
}

// Audit Log

export function getAuditLog(flagKey?: string, appId?: string): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (flagKey) params.set('flag_key', flagKey);
  if (appId) params.set('app_id', appId);
  const query = params.toString() ? `?${params}` : '';
  return authedRequest<AuditLogEntry[]>(`/audit-log${query}`);
}
