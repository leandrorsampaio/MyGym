import { nowISO } from '../lib/clock';
import type { GarminMetrics } from '../log/types';
import type { GarminSummary } from './parse';

/**
 * Ask our own Worker to read a Garmin activity. Rejects with a message fit to show the
 * user; callers keep the pasted URL either way so a failed fetch never blocks logging.
 */
export async function fetchGarminMetrics(activityId: string): Promise<GarminMetrics> {
  let res: Response;
  try {
    res = await fetch(`/api/garmin?id=${encodeURIComponent(activityId)}`, {
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new Error("You're offline — the link is saved, fetch it later.");
  }

  // An Access login redirect (or the dev server) yields HTML, not JSON.
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Error("Can't reach the server — the link is saved, fetch it later.");
  }

  const data = (await res.json()) as GarminSummary & { activityId?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Fetch failed (${res.status}).`);

  return {
    activityId: data.activityId ?? activityId,
    name: data.name,
    durationSec: data.durationSec,
    distanceM: data.distanceM,
    fetchedAt: nowISO(),
  };
}
