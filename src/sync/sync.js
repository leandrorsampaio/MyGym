import { useStore } from '../store/useStore';
import { pullLogs, pushLogs } from './api';
let inFlight = false;
/**
 * Write-behind backup sync (single user, single device — no real conflicts):
 *   1. pull server entries and merge (last-write-wins),
 *   2. push anything still pending, then clear it.
 * Fails silently when offline / unauthenticated; pending state is retried later.
 */
export async function syncNow() {
    if (inFlight)
        return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false)
        return;
    inFlight = true;
    try {
        const remote = await pullLogs();
        useStore.getState().applyRemote(remote);
        const { log, dirty, tombstones } = useStore.getState();
        const dirtySet = new Set(dirty);
        const upserts = log.filter((e) => dirtySet.has(e.id));
        if (upserts.length || tombstones.length) {
            await pushLogs(upserts, tombstones);
            useStore.getState().clearSynced(upserts.map((e) => e.id), tombstones.map((t) => t.id));
        }
    }
    catch {
        // SyncUnavailable / network error → keep pending, retry on next trigger.
    }
    finally {
        inFlight = false;
    }
}
let initialized = false;
/** Sync on startup and whenever connectivity returns. Idempotent. */
export function initSync() {
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
