import type { LogEntry } from '../log/types';
import type { Tombstone } from './merge';

/** Thrown when the API can't be reached (offline, server down). Retry later. */
export class SyncUnavailable extends Error {}

/**
 * Thrown when Cloudflare Access bounced us to a login page, or the API rejected the
 * token. Retrying is pointless — the user has to sign in again, which needs a real
 * navigation (see `functions/signin.ts`). Distinct from SyncUnavailable so the UI can
 * say so instead of silently piling up unsynced entries, which once hid a two-month
 * outage.
 */
export class AuthRequired extends Error {}

/**
 * `fetch`, with the one failure mode that matters here classified properly.
 *
 * When the Access session expires, Cloudflare answers with a redirect to its own login
 * origin. The browser refuses to expose a cross-origin redirect to a same-origin fetch,
 * so the promise rejects with a bare TypeError — indistinguishable from being offline.
 * Treating that as a network blip is what let an expired session look like "the app is
 * stuck on an old version": the service worker kept serving its precache, sync failed
 * silently, and nothing ever said to sign in.
 *
 * So: if the browser believes it is online and a request to our own origin still throws,
 * call it what it almost always is. The worst case is a dismissible prompt to sign in.
 */
async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new SyncUnavailable(`offline (${String(err)})`);
    }
    throw new AuthRequired('sign-in required (redirect hidden by the browser)');
  }
}

async function asJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') ?? '';
  // Access serves an HTML login page (via redirect) instead of our JSON; a stale or
  // missing token gets a 401/403 from checkAccess. Both mean "sign in again".
  if (res.redirected || res.status === 401 || res.status === 403) {
    throw new AuthRequired(`sign-in required (${res.status})`);
  }
  if (!res.ok || !ct.includes('application/json')) {
    throw new SyncUnavailable(`sync unavailable (${res.status})`);
  }
  return res.json();
}

export async function pullLogs(): Promise<LogEntry[]> {
  const res = await request('/api/logs', { headers: { accept: 'application/json' } });
  const data = await asJson(res);
  return (data.entries ?? []) as LogEntry[];
}

export async function pushLogs(upserts: LogEntry[], deletes: Tombstone[]): Promise<void> {
  const res = await request('/api/logs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ upserts, deletes }),
  });
  await asJson(res);
}
