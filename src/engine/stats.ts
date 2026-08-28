/**
 * Statistics — pure functions over the (small) activity log, computed client-side.
 * Covers the four homepage groups: consistency, football, gym breakdown, cycle.
 */
import type { LogEntry, SessionId, Sport } from '../log/types';
import { isGym, isMatch, isMatchSport } from '../log/types';
import { isoWeekKey, addDays } from './dates';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface GymStats {
  total: number;
  bySession: Record<SessionId, number>;
  complete: number;
  t1Only: number;
  avgRating: number;
}

export function gymStats(log: LogEntry[]): GymStats {
  const gym = log.filter(isGym);
  const bySession: Record<SessionId, number> = { A: 0, B: 0, C: 0 };
  for (const e of gym) bySession[e.session]++;
  return {
    total: gym.length,
    bySession,
    complete: gym.filter((e) => e.completion === 'complete').length,
    t1Only: gym.filter((e) => e.completion === 't1').length,
    avgRating: avg(gym.map((e) => e.rating)),
  };
}

export interface FootballStats {
  /** Everything logged on the football side — real matches plus training. */
  total: number;
  /** Real matches only (football + futsal). Training has no scoreline. */
  matches: number;
  /** Football sessions played without a match. */
  trainings: number;
  bySport: Record<Sport, number>;
  /** Goals and goals/match are over real matches only, so training doesn't dilute them. */
  totalGoals: number;
  goalsPerMatch: number;
  /** Performance rating averaged over everything on the football side, training included. */
  avgRating: number;
}

export function footballStats(log: LogEntry[]): FootballStats {
  const played = log.filter(isMatch);
  const bySport: Record<Sport, number> = { football: 0, training: 0, futsal: 0 };
  for (const e of played) bySport[e.sport]++;
  const matches = played.filter((e) => isMatchSport(e.sport));
  const totalGoals = matches.reduce((a, e) => a + e.goals, 0);
  return {
    total: played.length,
    matches: matches.length,
    trainings: bySport.training,
    bySport,
    totalGoals,
    goalsPerMatch: matches.length ? totalGoals / matches.length : 0,
    avgRating: avg(played.map((e) => e.rating)),
  };
}

export interface Consistency {
  /** Activities (gym + matches) in the current ISO week. */
  thisWeek: number;
  /** Consecutive ISO weeks up to and including this one with ≥1 activity. */
  streakWeeks: number;
  /** Average activities/week over the last `windowWeeks` weeks (incl. empty weeks). */
  avgPerWeek: number;
}

export function consistency(log: LogEntry[], today: string, windowWeeks = 8): Consistency {
  const weekCounts = new Map<string, number>();
  for (const e of log) {
    const key = isoWeekKey(e.date);
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  const thisWeekKey = isoWeekKey(today);
  const thisWeek = weekCounts.get(thisWeekKey) ?? 0;

  // Streak: walk back week by week while each week has activity.
  let streakWeeks = 0;
  for (let i = 0; ; i++) {
    const key = isoWeekKey(addDays(today, -7 * i));
    if ((weekCounts.get(key) ?? 0) > 0) streakWeeks++;
    else break;
  }

  // Average over the trailing window (including weeks with zero activity).
  let windowTotal = 0;
  for (let i = 0; i < windowWeeks; i++) {
    windowTotal += weekCounts.get(isoWeekKey(addDays(today, -7 * i))) ?? 0;
  }
  return { thisWeek, streakWeeks, avgPerWeek: windowTotal / windowWeeks };
}
