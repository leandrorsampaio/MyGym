/**
 * Derived homepage insights — all pure functions over the log: the "last activity"
 * line, the activity heatmap, and auto-surfaced highlights/records.
 */
import type { GymEntry, LogEntry, MatchEntry } from '../log/types';
import { isGym, isMatch, isMatchSport } from '../log/types';
import { addDays, daysBetween, isoWeekKey, mondayOf, weekIndex } from './dates';

function newestByDate<T extends LogEntry>(entries: T[]): T | undefined {
  return entries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
}

export interface LastActivity {
  gym?: { entry: GymEntry; daysAgo: number };
  match?: { entry: MatchEntry; daysAgo: number };
}

export function lastActivity(log: LogEntry[], today: string): LastActivity {
  const gym = newestByDate(log.filter(isGym));
  const match = newestByDate(log.filter(isMatch));
  return {
    gym: gym ? { entry: gym, daysAgo: daysBetween(gym.date, today) } : undefined,
    match: match ? { entry: match, daysAgo: daysBetween(match.date, today) } : undefined,
  };
}

export interface HeatDay {
  date: string;
  gym: number;
  match: number;
  /** Best rating among that day's gym sessions (0 if none) — drives colour intensity. */
  gymRating: number;
  /** Best rating among that day's matches (0 if none). */
  matchRating: number;
  future: boolean;
}

/** A grid of the last `weeks` ISO weeks: outer = weeks (old→new), inner = Mon→Sun. */
export function buildHeatmap(log: LogEntry[], today: string, weeks = 12): HeatDay[][] {
  const gymByDate = new Map<string, number>();
  const matchByDate = new Map<string, number>();
  const gymRating = new Map<string, number>();
  const matchRating = new Map<string, number>();
  for (const e of log) {
    if (isGym(e)) {
      gymByDate.set(e.date, (gymByDate.get(e.date) ?? 0) + 1);
      gymRating.set(e.date, Math.max(gymRating.get(e.date) ?? 0, e.rating));
    } else if (isMatch(e)) {
      matchByDate.set(e.date, (matchByDate.get(e.date) ?? 0) + 1);
      matchRating.set(e.date, Math.max(matchRating.get(e.date) ?? 0, e.rating));
    }
  }

  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  const grid: HeatDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, 7 * w + d);
      week.push({
        date,
        gym: gymByDate.get(date) ?? 0,
        match: matchByDate.get(date) ?? 0,
        gymRating: gymRating.get(date) ?? 0,
        matchRating: matchRating.get(date) ?? 0,
        future: date > today,
      });
    }
    grid.push(week);
  }
  return grid;
}

export interface Highlights {
  totalSessions: number;
  /** Real matches only — training is counted separately so goal records stay honest. */
  totalMatches: number;
  totalTrainings: number;
  totalGoals: number;
  bestMatchGoals: number;
  longestStreakWeeks: number;
  bestWeekCount: number;
}

export function highlights(log: LogEntry[]): Highlights {
  const gym = log.filter(isGym);
  const played = log.filter(isMatch);
  const matches = played.filter((e) => isMatchSport(e.sport));

  // Longest run of consecutive ISO weeks with any activity.
  const indices = [...new Set(log.map((e) => weekIndex(e.date)))].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const i of indices) {
    run = prev !== null && i === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = i;
  }

  // Most activities in a single ISO week.
  const perWeek = new Map<string, number>();
  for (const e of log) perWeek.set(isoWeekKey(e.date), (perWeek.get(isoWeekKey(e.date)) ?? 0) + 1);

  return {
    totalSessions: gym.length,
    totalMatches: matches.length,
    totalTrainings: played.length - matches.length,
    totalGoals: matches.reduce((a, m) => a + m.goals, 0),
    bestMatchGoals: matches.reduce((a, m) => Math.max(a, m.goals), 0),
    longestStreakWeeks: longest,
    bestWeekCount: [...perWeek.values()].reduce((a, b) => Math.max(a, b), 0),
  };
}
