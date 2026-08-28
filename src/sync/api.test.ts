import { describe, it, expect, afterEach, vi } from 'vitest';
import { AuthRequired, SyncUnavailable, pullLogs } from './api';

const realFetch = globalThis.fetch;
const realOnLine = Object.getOwnPropertyDescriptor(globalThis.navigator ?? {}, 'onLine');

function setOnline(value: boolean) {
  Object.defineProperty(globalThis.navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  globalThis.fetch = realFetch;
  if (realOnLine) Object.defineProperty(globalThis.navigator, 'onLine', realOnLine);
});

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('pullLogs error classification', () => {
  it('returns entries on a normal response', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ entries: [{ id: 'a' }] })) as typeof fetch;
    await expect(pullLogs()).resolves.toEqual([{ id: 'a' }]);
  });

  it('treats a thrown fetch while online as needing sign-in, not a network blip', async () => {
    // What a blocked cross-origin Access redirect actually looks like to the page.
    setOnline(true);
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await expect(pullLogs()).rejects.toBeInstanceOf(AuthRequired);
  });

  it('treats the same throw as unavailable when the browser knows it is offline', async () => {
    setOnline(false);
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await expect(pullLogs()).rejects.toBeInstanceOf(SyncUnavailable);
  });

  it('still flags a 403 from our own Access check', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: 'no' }, { status: 403 })) as typeof fetch;
    await expect(pullLogs()).rejects.toBeInstanceOf(AuthRequired);
  });

  it('treats a 500 as unavailable and worth retrying', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({}, { status: 500 })) as typeof fetch;
    await expect(pullLogs()).rejects.toBeInstanceOf(SyncUnavailable);
  });
});
