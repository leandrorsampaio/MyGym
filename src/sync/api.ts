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
  const res = await fetch('/api/logs', { headers: { accept: 'application/json' } });
  const data = await asJson(res);
  return (data.entries ?? []) as LogEntry[];
}

export async function pushLogs(upserts: LogEntry[], deletes: Tombstone[]): Promise<void> {
  const res = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ upserts, deletes }),
  });
  await asJson(res);
}
