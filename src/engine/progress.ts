/**
 * Progress metrics — the pure functions behind the Progress dashboard.
 *
 * All of these read `garmin` off log entries, which is optional everywhere: an activity
 * that was never linked, or was logged before the rendering Worker existed, simply has no
 * numbers. Nothing here invents a value to fill a gap — a missing measure stays missing,
 * and the caller is told how much of the window was actually covered so the UI can say
 * "3 of 8 linked" instead of drawing a confident line through three dots.
 *
 * Pure and clock-free, like everything in `engine/` — `today` is passed in.
 */
import type { GarminMetrics, LogEntry, Sport } from '../log/types';
import { isGym, isMatchSport } from '../log/types';
import { addDays, isoWeekKey, mondayOf } from './dates';
import { consistency } from './stats';

/** Below this many points a trend line is noise, and the UI should say so instead. */
export const TREND_MIN_POINTS = 5;

/** Seconds spent at or above `fromZone` (zone 4 = threshold, 5 = max). */
export function secondsAtOrAbove(garmin: GarminMetrics | undefined, fromZone: number): number | undefined {
  const zones = garmin?.hrZones;
  if (!zones?.length) return undefined;
  return zones.filter((z) => z.zone >= fromZone).reduce((a, z) => a + z.seconds, 0);
}

export interface ActivityPoint {
  id: string;
  date: string;
  kind: 'gym' | 'match';
  /** Only for football-side entries. */
  sport?: Sport;
  goals?: number;
  durationSec?: number;
  exerciseLoad?: number;
  avgHr?: number;
  maxHr?: number;
  /** Seconds in HR zones 4–5, and that as a share of the activity (0–1). */
  highSec?: number;
  highShare?: number;
}

/** Every Garmin-linked activity, oldest first. Entries with no data are left out. */
export function activityPoints(log: LogEntry[]): ActivityPoint[] {
  const out: ActivityPoint[] = [];
  for (const e of log) {
    const g = e.garmin;
    if (!g) continue;
    const highSec = secondsAtOrAbove(g, 4);
    // Share is against time actually in zones, not elapsed: a watch that dropped out
    // for part of a session would otherwise look like an easy one.
    const inZones = g.hrZones?.reduce((a, z) => a + z.seconds, 0);
    const point: ActivityPoint = {
      id: e.id,
      date: e.date,
      kind: e.kind,
      durationSec: g.durationSec,
      exerciseLoad: g.exerciseLoad,
      avgHr: g.avgHr,
      maxHr: g.maxHr,
    };
    if (!isGym(e)) {
      point.sport = e.sport;
      point.goals = e.goals;
    }
    if (highSec != null) point.highSec = highSec;
    if (highSec != null && inZones) point.highShare = highSec / inZones;
    out.push(point);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface WeeklyLoad {
  weekKey: string;
  /** Monday of that ISO week, for labelling. */
  weekStart: string;
  gym: number;
  football: number;
  total: number;
  /** How many activities that week, and how many of them carried a load figure. */
  activities: number;
  linked: number;
}

/**
 * Exercise load per ISO week, split gym vs football, for the last `weeks` weeks
 * (oldest first, including empty weeks so the bars keep a steady rhythm).
 */
export function weeklyLoad(log: LogEntry[], today: string, weeks = 12): WeeklyLoad[] {
  const buckets = new Map<string, WeeklyLoad>();
  const start = mondayOf(addDays(mondayOf(today), -7 * (weeks - 1)));
  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(start, 7 * w);
    buckets.set(isoWeekKey(weekStart), {
      weekKey: isoWeekKey(weekStart),
      weekStart,
      gym: 0,
      football: 0,
      total: 0,
      activities: 0,
      linked: 0,
    });
  }

  for (const e of log) {
    const bucket = buckets.get(isoWeekKey(e.date));
    if (!bucket) continue;
    bucket.activities++;
    const load = e.garmin?.exerciseLoad;
    if (load == null) continue;
    bucket.linked++;
    if (isGym(e)) bucket.gym += load;
    else bucket.football += load;
    bucket.total += load;
  }

  return [...buckets.values()];
}

/**
 * Week-on-week change in total load, as a fraction. Ramping hard is how you dig a hole,
 * so this is the number worth surfacing — but only where both weeks actually have data.
 */
export function loadRamp(weeks: WeeklyLoad[]): number | undefined {
  const withData = weeks.filter((w) => w.total > 0);
  if (withData.length < 2) return undefined;
  const [prev, last] = withData.slice(-2);
  if (!prev || !last || prev.total === 0) return undefined;
  return (last.total - prev.total) / prev.total;
}

/** Matches only (training has no scoreline), oldest first, with a rolling goal average. */
export interface GoalPoint {
  date: string;
  goals: number;
  /** Mean goals over this match and the `window - 1` before it. */
  rolling: number;
}

export function goalTrend(log: LogEntry[], window = 5): GoalPoint[] {
  const matches = log
    .filter((e) => !isGym(e) && isMatchSport(e.sport))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return matches.map((m, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = matches.slice(from, i + 1);
    const goals = (m as { goals: number }).goals;
    return {
      date: m.date,
      goals,
      rolling: slice.reduce((a, e) => a + (e as { goals: number }).goals, 0) / slice.length,
    };
  });
}

/**
 * A one-sentence read on the week, with its evidence — the thing Review should say before
 * it shows a single chart.
 *
 * Deliberately not a score out of 100. A fabricated number would imply a precision this
 * data does not have; a plain sentence you can check against the charts underneath is more
 * honest and more useful. It is also allowed to admit it cannot tell, which matters when
 * most activities carry no watch data.
 */
export type VerdictTone = 'on-track' | 'high' | 'light' | 'unknown';

export interface Verdict {
  tone: VerdictTone;
  /** The claim. One line. */
  headline: string;
  /** Why it says that, in terms you can go and verify below. */
  detail: string;
}

/** Ramp above this reads as a real jump rather than ordinary week-to-week noise. */
const HIGH_RAMP = 0.5;
/** Below this share of your usual weekly count, the week is genuinely lighter. */
const LIGHT_SHARE = 0.6;

export function weeklyVerdict(log: LogEntry[], today: string): Verdict {
  const c = consistency(log, today);
  const weeks = weeklyLoad(log, today, 12);
  const ramp = loadRamp(weeks);
  const linked = weeks.reduce((a, w) => a + w.linked, 0);

  const hrs = activityPoints(log)
    .filter((p) => p.kind === 'match' && p.avgHr != null)
    .map((p) => p.avgHr!);

  // Evidence sentence, chosen by what the data can actually support.
  const detail =
    hrs.length >= TREND_MIN_POINTS
      ? hrs[hrs.length - 1]! < hrs[0]!
        ? `Match heart rate has come down from ${hrs[0]} to ${hrs[hrs.length - 1]} bpm across ${hrs.length} recorded games.`
        : `Match heart rate is steady around ${Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)} bpm across ${hrs.length} recorded games.`
      : linked === 0
        ? 'No activity has watch data yet, so nothing here can speak to fitness.'
        : `Only ${hrs.length} match${hrs.length === 1 ? '' : 'es'} carry heart-rate data — too few to read a fitness trend.`;

  if (c.thisWeek === 0) {
    return {
      tone: 'light',
      headline: 'Nothing logged this week yet.',
      detail: `You normally average ${c.avgPerWeek.toFixed(1)} activities a week.`,
    };
  }

  if (ramp != null && ramp > HIGH_RAMP) {
    return {
      tone: 'high',
      headline: `Load is up ${Math.round(ramp * 100)}% on last week.`,
      detail: `${c.thisWeek} activities. A jump this size is where legs get dug into a hole — worth an easier week next. ${detail}`,
    };
  }

  if (c.avgPerWeek > 0 && c.thisWeek < c.avgPerWeek * LIGHT_SHARE) {
    return {
      tone: 'light',
      headline: `A lighter week — ${c.thisWeek} of your usual ${c.avgPerWeek.toFixed(1)}.`,
      detail: `Not a problem on its own. ${detail}`,
    };
  }

  if (linked === 0) {
    return {
      tone: 'unknown',
      headline: `${c.thisWeek} activities this week.`,
      detail: 'No watch data linked yet, so there is nothing to say about load or fitness.',
    };
  }

  return {
    tone: 'on-track',
    headline: `${c.thisWeek} activities, load close to your recent average.`,
    detail,
  };
}
