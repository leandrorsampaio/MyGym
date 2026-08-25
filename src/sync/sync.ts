import { useStore } from '../store/useStore';
import { AuthRequired, pullLogs, pushLogs } from './api';

let inFlight = false;

/**
 * Write-behind backup sync (single user, single device — no real conflicts):
 *   1. pull server entries and merge (last-write-wins),
 *   2. push anything still pending, then clear it.
 * Network failures stay quiet and retry later. An expired Access session sets
 * `authRequired` so the UI can prompt a real sign-in — retrying that never helps.
 */
export async function syncNow(): Promise<void> {
  if (inFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  inFlight = true;
  try {
    const remote = await pullLogs();
    useStore.getState().setAuthRequired(false);
    useStore.getState().applyRemote(remote);

    const { log, dirty, tombstones } = useStore.getState();
    const dirtySet = new Set(dirty);
    const upserts = log.filter((e) => dirtySet.has(e.id));
    if (upserts.length || tombstones.length) {
      await pushLogs(upserts, tombstones);
      useStore.getState().clearSynced(
        upserts.map((e) => e.id),
        tombstones.map((t) => t.id),
      );
    }
  } catch (err) {
    // Auth failures get surfaced so they can't hide; plain network errors stay quiet
    // and retry on the next trigger.
    useStore.getState().setAuthRequired(err instanceof AuthRequired);
  } finally {
    inFlight = false;
  }
}

let initialized = false;

/** Sync on startup and whenever connectivity returns. Idempotent. */
export function initSync(): void {
  if (initialized) {
    void syncNow();
    return;
  }
  initialized = true;
  void syncNow();
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void syncNow());
  }
}
