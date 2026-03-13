import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWebhookNotification } from '../webhook.js';

describe('sendWebhookNotification', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    delete process.env.WEBHOOK_URL;
    globalThis.fetch = originalFetch;
  });

  it('does nothing when WEBHOOK_URL is not set', async () => {
    await sendWebhookNotification('my-flag', 'created', 'alice@test.com');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with correct URL, method, and JSON body when configured', async () => {
    process.env.WEBHOOK_URL = 'https://hooks.example.com/webhook';

    await sendWebhookNotification('my-flag', 'updated', 'bob@test.com');

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('https://hooks.example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
    });
  });

  it('payload contains flag key, action, and actor', async () => {
    process.env.WEBHOOK_URL = 'https://hooks.example.com/webhook';

    await sendWebhookNotification('dark-mode', 'deleted', 'carol@test.com');

    const call = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string);

    expect(body.text).toBe('Flag "dark-mode" was deleted by carol@test.com');
    expect(body.content).toBe('Flag "dark-mode" was deleted by carol@test.com');
  });

  it('handles fetch failure gracefully without throwing', async () => {
    process.env.WEBHOOK_URL = 'https://hooks.example.com/webhook';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    await expect(
      sendWebhookNotification('my-flag', 'created', 'alice@test.com')
    ).resolves.toBeUndefined();
  });
});
