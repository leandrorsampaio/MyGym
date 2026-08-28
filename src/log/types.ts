/**
 * Activity log — append-mostly event log. The single source of truth at runtime;
 * recommendation, rotation and stats are all pure functions over this list.
 */

export type SessionId = 'A' | 'B' | 'C';
export type Completion = 'complete' | 't1';
export type Rating = 1 | 2 | 3;

/**
 * The three things logged on the football side. `football` and `futsal` are real
 * matches; `training` is a football session played without a match (no scoreline).
 */
export const SPORTS = ['football', 'training', 'futsal'] as const;
export type Sport = (typeof SPORTS)[number];

/** Only real matches carry a scoreline — training has no opponent to score against. */
export function isMatchSport(sport: Sport): boolean {
  return sport !== 'training';
}

/** Emoji for a football-side entry (lists, detail header). */
export function sportIcon(sport: Sport): string {
  return sport === 'training' ? '🥅' : '⚽';
}

/** Summary read off a Garmin Connect activity page (see `src/garmin/parse.ts`). */
export interface GarminMetrics {
  activityId: string;
  /** Activity name as Garmin shows it, e.g. "Timed Activity". */
  name?: string;
  /** Elapsed time in seconds. */
  durationSec?: number;
  /** Metres. 0 on a device without GPS (the CIRQA band). */
  distanceM?: number;
  /** When we fetched it — the numbers are a snapshot, not live. */
  fetchedAt: string;
}

export interface GymEntry {
  id: string;
  kind: 'gym';
  /** Calendar date 'YYYY-MM-DD'. */
  date: string;
  session: SessionId;
  completion: Completion;
  rating: Rating;
  /** For C sessions: which conditioning variant was done (drives next rotation). */
  cType?: string;
  /** Which Core Finisher slot-3 option was done (every gym session advances this). */
  slot3?: string;
  /** C session was augmented with Squat 2×5 + RDL 2×8 (the two-futsal-weeks rule). */
  legAppend?: boolean;
  updatedAt: string;
}

export interface MatchEntry {
  id: string;
  kind: 'match';
  date: string;
  sport: Sport;
  /** Goals scored. Always 0 for `training`, which has no scoreline. */
  goals: number;
  rating: Rating;
  /** Garmin Connect activity this match was recorded with. Pasted when logging. */
  garminUrl?: string;
  /** What we read off that activity. Absent until a fetch succeeds. */
  garmin?: GarminMetrics;
  updatedAt: string;
}

export type LogEntry = GymEntry | MatchEntry;

export function isGym(e: LogEntry): e is GymEntry {
  return e.kind === 'gym';
}
export function isMatch(e: LogEntry): e is MatchEntry {
  return e.kind === 'match';
}
