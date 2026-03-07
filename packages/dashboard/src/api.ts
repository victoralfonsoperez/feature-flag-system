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
  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function getFlags(env?: Environment): Promise<Flag[]> {
  const query = env ? `?env=${env}` : '';
  return request<Flag[]>(`/flags${query}`);
}

export function getFlag(key: string): Promise<Flag> {
  return request<Flag>(`/flags/${encodeURIComponent(key)}`);
}

export function createFlag(input: CreateFlagInput, token: string): Promise<Flag> {
  return request<Flag>('/flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function updateFlag(key: string, input: UpdateFlagInput, token: string): Promise<Flag> {
  return request<Flag>(`/flags/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function deleteFlag(key: string, token: string): Promise<void> {
  return request<void>(`/flags/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
