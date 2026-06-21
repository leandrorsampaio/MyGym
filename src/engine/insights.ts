/**
 * Derived homepage insights — all pure functions over the log: the "last activity"
 * line, the activity heatmap, and auto-surfaced highlights/records.
 */
import type { GymEntry, LogEntry, MatchEntry } from '../log/types';
import { isGym, isMatch } from '../log/types';
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
  future: boolean;
}

/** A grid of the last `weeks` ISO weeks: outer = weeks (old→new), inner = Mon→Sun. */
export function buildHeatmap(log: LogEntry[], today: string, weeks = 12): HeatDay[][] {
  const gymByDate = new Map<string, number>();
  const matchByDate = new Map<string, number>();
  for (const e of log) {
    const map = isGym(e) ? gymByDate : matchByDate;
    map.set(e.date, (map.get(e.date) ?? 0) + 1);
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
        future: date > today,
      });
    }
    grid.push(week);
  }
  return grid;
}

export interface Highlights {
  totalSessions: number;
  totalMatches: number;
  totalGoals: number;
  bestMatchGoals: number;
  longestStreakWeeks: number;
  bestWeekCount: number;
}

export function highlights(log: LogEntry[]): Highlights {
  const gym = log.filter(isGym);
  const matches = log.filter(isMatch);

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
    totalGoals: matches.reduce((a, m) => a + m.goals, 0),
    bestMatchGoals: matches.reduce((a, m) => Math.max(a, m.goals), 0),
    longestStreakWeeks: longest,
    bestWeekCount: [...perWeek.values()].reduce((a, b) => Math.max(a, b), 0),
  };
}
