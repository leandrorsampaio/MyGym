/**
 * Local backup of the activity log — a file you can save yourself, independent of the
 * D1 cloud backup. The log is the source of truth for every recommendation and stat, and
 * it lives only in IndexedDB on the phone, so a copy that doesn't depend on the network
 * (or on the Access session still being valid) is the last line of defence.
 *
 * Pure and clock-free: `now` is passed in, so this is unit-testable like `engine/*`.
 */
import { z } from 'zod';
import type { LogEntry } from './types';

const rating = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected a YYYY-MM-DD date');

const gymEntry = z.object({
  id: z.string().min(1),
  kind: z.literal('gym'),
  date: isoDate,
  session: z.enum(['A', 'B', 'C']),
  completion: z.enum(['complete', 't1']),
  rating,
  cType: z.string().optional(),
  slot3: z.string().optional(),
  legAppend: z.boolean().optional(),
  updatedAt: z.string().min(1),
});

const garminMetrics = z.object({
  activityId: z.string(),
  name: z.string().optional(),
  durationSec: z.number().optional(),
  distanceM: z.number().optional(),
  fetchedAt: z.string(),
});

const matchEntry = z.object({
  id: z.string().min(1),
  kind: z.literal('match'),
  date: isoDate,
  sport: z.enum(['football', 'futsal']),
  goals: z.number().int().min(0),
  rating,
  garminUrl: z.string().optional(),
  garmin: garminMetrics.optional(),
  updatedAt: z.string().min(1),
});

const logEntry = z.discriminatedUnion('kind', [gymEntry, matchEntry]);

/** The file we write. Wrapped so a restore can tell a log from a program by shape. */
const backupFile = z.object({
  app: z.literal('mygym'),
  kind: z.literal('activity-log'),
  exportedAt: z.string(),
  count: z.number().int().min(0),
  entries: z.array(logEntry),
});

export type LogBackup = z.infer<typeof backupFile>;

export function buildBackup(log: LogEntry[], now: string): LogBackup {
  return { app: 'mygym', kind: 'activity-log', exportedAt: now, count: log.length, entries: log };
}

export function backupFilename(now: string): string {
  return `mygym-log-${now.slice(0, 10)}.json`;
}

/**
 * Read a backup back in. Accepts the wrapper we write, or a bare array of entries so a
 * hand-edited file still restores. Returns an error string rather than throwing.
 */
export function parseBackup(input: unknown): { entries: LogEntry[] } | { error: string } {
  // A program JSON is the easiest thing to grab by mistake — say so plainly.
  if (input && typeof input === 'object' && !Array.isArray(input) && 'workouts' in input) {
    return { error: "That's a training program, not an activity log. Use the program section above." };
  }

  const wrapped = backupFile.safeParse(input);
  if (wrapped.success) return { entries: wrapped.data.entries };

  const bare = z.array(logEntry).safeParse(input);
  if (bare.success) return { entries: bare.data };

  const issues = (Array.isArray(input) ? bare : wrapped).error.issues
    .slice(0, 4)
    .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    .join('\n');
  return { error: `Not a valid log backup.\n${issues}` };
}
