import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFlags,
  getFlag,
  createFlag,
  updateFlag,
  deleteFlag,
  ApiError,
} from './api';
import type { Flag, CreateFlagInput, UpdateFlagInput } from './api';

const mockFlag: Flag = {
  key: 'test-flag',
  value: 'true',
  type: 'runtime',
  environment: 'production',
  description: 'A test flag',
  variants: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: 'system',
};

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('getFlags', () => {
  it('fetches flags without environment filter', async () => {
    mockFetch.mockResolvedValue(jsonResponse([mockFlag]));

    const result = await getFlags();

    expect(mockFetch).toHaveBeenCalledWith('/api/flags', { credentials: 'include' });
    expect(result).toEqual([mockFlag]);
  });

  it('fetches flags with environment filter', async () => {
    mockFetch.mockResolvedValue(jsonResponse([mockFlag]));

    await getFlags('staging');

    expect(mockFetch).toHaveBeenCalledWith('/api/flags?env=staging', { credentials: 'include' });
  });

  it('throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Internal error'));

    const err = await getFlags().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe('Internal error');
  });
});

describe('getFlag', () => {
  it('fetches a single flag by key', async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockFlag));

    const result = await getFlag('test-flag');

    expect(mockFetch).toHaveBeenCalledWith('/api/flags/test-flag', { credentials: 'include' });
    expect(result).toEqual(mockFlag);
  });

  it('encodes special characters in key', async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockFlag));

    await getFlag('flag with spaces');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/flags/flag%20with%20spaces',
      { credentials: 'include' },
    );
  });

  it('throws ApiError on 404', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Flag not found'));

    await expect(getFlag('missing')).rejects.toMatchObject({
      status: 404,
      message: 'Flag not found',
    });
  });
});

describe('createFlag', () => {
  const input: CreateFlagInput = {
    key: 'new-flag',
    value: 'false',
    type: 'build-time',
    environment: 'development',
    description: 'New flag',
  };

  it('sends POST with body (cookie-based auth)', async () => {
    const created = { ...mockFlag, ...input };
    mockFetch.mockResolvedValue(jsonResponse(created, 201));

    const result = await createFlag(input);

    expect(mockFetch).toHaveBeenCalledWith('/api/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    expect(result.key).toBe('new-flag');
  });

  it('throws ApiError on 409 conflict', async () => {
    mockFetch.mockResolvedValue(errorResponse(409, 'Flag already exists'));

    await expect(createFlag(input)).rejects.toMatchObject({
      status: 409,
      message: 'Flag already exists',
    });
  });

  it('throws ApiError on 401 unauthorized', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(401, 'Authentication required'),
    );

    await expect(createFlag(input)).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('updateFlag', () => {
  const input: UpdateFlagInput = { value: 'updated-value' };

  it('sends PUT with body (cookie-based auth)', async () => {
    const updated = { ...mockFlag, value: 'updated-value' };
    mockFetch.mockResolvedValue(jsonResponse(updated));

    const result = await updateFlag('test-flag', input);

    expect(mockFetch).toHaveBeenCalledWith('/api/flags/test-flag', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    expect(result.value).toBe('updated-value');
  });

  it('throws ApiError on 401 unauthorized', async () => {
    mockFetch.mockResolvedValue(errorResponse(401, 'Authentication required'));

    await expect(updateFlag('test-flag', input)).rejects.toMatchObject({
      status: 401,
      message: 'Authentication required',
    });
  });
});

describe('deleteFlag', () => {
  it('sends DELETE (cookie-based auth)', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteFlag('test-flag');

    expect(mockFetch).toHaveBeenCalledWith('/api/flags/test-flag', {
      method: 'DELETE',
      credentials: 'include',
    });
  });

  it('returns undefined on 204', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await deleteFlag('test-flag');

    expect(result).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('has correct name, status, and message', () => {
    const err = new ApiError(422, 'Validation failed');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(422);
    expect(err.message).toBe('Validation failed');
  });

  it('falls back to statusText when error body is missing', async () => {
    mockFetch.mockResolvedValue(
      new Response('not json', { status: 502, statusText: 'Bad Gateway' }),
    );

    await expect(getFlags()).rejects.toMatchObject({
      status: 502,
      message: 'Bad Gateway',
    });
  });
});
