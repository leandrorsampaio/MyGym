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

/** One heart-rate zone's share of an activity. Zone 1 (easy) → 5 (max). */
export interface GarminHrZone {
  zone: number;
  /** Lower bpm boundary of the zone, as Garmin has it configured. */
  lowBpm?: number;
  seconds: number;
}

/** One downsampled point on the activity's time series. */
export interface GarminSample {
  /** Seconds from the start of the activity. */
  t: number;
  hr?: number;
  bodyBattery?: number;
}

/**
 * Everything we keep from a Garmin Connect activity — the numbers Garmin shows on its
 * own activity page, stored in our log so the data is ours and works offline.
 *
 * Every measure is a flat optional scalar on purpose: a report that plots "exercise load
 * over the season" or "avg HR per match" is then a map over the log, with no reshaping.
 * `hrZones` and `series` are the only nested parts, and both are fixed-shape arrays.
 *
 * All fields except `activityId`/`fetchedAt` are optional: older entries were captured
 * when we could only read name/duration/distance, and a device without GPS reports no
 * distance. Render what is present.
 */
export interface GarminMetrics {
  activityId: string;
  /** Activity name as Garmin shows it, e.g. "Timed Activity". */
  name?: string;
  /** Garmin's activity type key, e.g. 'soccer'. */
  type?: string;
  /** Local start time as Garmin reports it, 'YYYY-MM-DDTHH:mm:ss.S'. */
  startTimeLocal?: string;

  durationSec?: number;
  movingDurationSec?: number;
  /** Metres. 0 on a device without GPS (the CIRQA band). */
  distanceM?: number;
  steps?: number;

  calories?: number;
  /** Calories you would have burned at rest over the same period. */
  restingCalories?: number;

  avgHr?: number;
  maxHr?: number;
  minHr?: number;

  aerobicTrainingEffect?: number;
  anaerobicTrainingEffect?: number;
  /** Garmin's label for the session, e.g. 'LACTATE_THRESHOLD'. */
  trainingEffectLabel?: string;
  aerobicTrainingEffectMessage?: string;
  anaerobicTrainingEffectMessage?: string;

  exerciseLoad?: number;
  moderateIntensityMinutes?: number;
  vigorousIntensityMinutes?: number;
  bodyBatteryDelta?: number;
  sweatLossMl?: number;

  hrZones?: GarminHrZone[];
  /** Downsampled HR / body battery curve. Absent when the fetch only got the summary. */
  series?: GarminSample[];

  /** When we fetched it — the numbers are a snapshot, not live. */
  fetchedAt: string;
}

/**
 * What any entry carries once it was also recorded on the watch. Both a gym session and
 * a match can be: the link is pasted when logging, and the numbers are fetched from it.
 */
export interface GarminLinked {
  /** Garmin Connect activity this was recorded with. Pasted when logging. */
  garminUrl?: string;
  /** What we read off that activity. Absent until a fetch succeeds. */
  garmin?: GarminMetrics;
}

export interface GymEntry extends GarminLinked {
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

export interface MatchEntry extends GarminLinked {
  id: string;
  kind: 'match';
  date: string;
  sport: Sport;
  /** Goals scored. Always 0 for `training`, which has no scoreline. */
  goals: number;
  rating: Rating;
  updatedAt: string;
}

export type LogEntry = GymEntry | MatchEntry;

export function isGym(e: LogEntry): e is GymEntry {
  return e.kind === 'gym';
}
export function isMatch(e: LogEntry): e is MatchEntry {
  return e.kind === 'match';
}
