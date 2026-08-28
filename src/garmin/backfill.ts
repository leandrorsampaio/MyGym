/**
 * Catching up every activity that has a Garmin link but no data behind it.
 *
 * The dashboard is only as good as the history behind it, and opening entries one at a
 * time to backfill them is a chore. This does the same work in a batch.
 *
 * Deliberately sequential. Each fetch drives a real browser server-side, and the Workers
 * Free plan allows one new browser instance every 20 seconds — firing these in parallel
 * would just collect rate-limit errors. On a refusal we back off and retry rather than
 * burning through the list; a failure is recorded and the run continues.
 */
import type { GarminMetrics, LogEntry } from '../log/types';
import { isThinGarmin } from './shape';
import { parseGarminActivityId } from './parse';

/** Entries we could fetch: a usable link, and nothing real behind it yet. Pure. */
export function backfillCandidates(log: LogEntry[]): LogEntry[] {
  return log
    .filter((e) => !!parseGarminActivityId(e.garminUrl ?? e.garmin?.activityId ?? ''))
    .filter((e) => isThinGarmin(e.garmin))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
}

export interface BackfillProgress {
  done: number;
  failed: number;
  total: number;
  /** Date of the entry currently being fetched, for the UI to show. */
  current?: string;
}

export interface BackfillOptions {
  /** Injected so tests don't need timers or network. */
  fetchOne: (activityId: string) => Promise<GarminMetrics>;
  onEntry: (entry: LogEntry) => void;
  onProgress?: (p: BackfillProgress) => void;
  /** Resolves after `ms`; injected so tests run instantly. */
  wait?: (ms: number) => Promise<void>;
  shouldStop?: () => boolean;
  /** Attempts per entry before giving up on it. */
  attempts?: number;
  /** First back-off, doubled each retry. Matches the free plan's instance rate limit. */
  backoffMs?: number;
}

export async function runBackfill(
  entries: LogEntry[],
  opts: BackfillOptions,
): Promise<BackfillProgress> {
  const wait = opts.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const attempts = opts.attempts ?? 3;
  const backoffMs = opts.backoffMs ?? 20_000;

  const progress: BackfillProgress = { done: 0, failed: 0, total: entries.length };
  opts.onProgress?.({ ...progress });

  for (const entry of entries) {
    if (opts.shouldStop?.()) break;
    const activityId = parseGarminActivityId(entry.garminUrl ?? entry.garmin?.activityId ?? '');
    if (!activityId) {
      progress.failed++;
      continue;
    }

    progress.current = entry.date;
    opts.onProgress?.({ ...progress });

    let ok = false;
    for (let attempt = 0; attempt < attempts && !ok; attempt++) {
      if (attempt > 0) await wait(backoffMs * 2 ** (attempt - 1));
      if (opts.shouldStop?.()) break;
      try {
        const garmin = await opts.fetchOne(activityId);
        opts.onEntry({ ...entry, garmin });
        ok = true;
      } catch {
        // Rate limit or a transient server error — the next attempt waits longer.
      }
    }

    if (ok) progress.done++;
    else progress.failed++;
    opts.onProgress?.({ ...progress });
  }

  progress.current = undefined;
  opts.onProgress?.({ ...progress });
  return progress;
}
