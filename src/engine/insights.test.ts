import { describe, it, expect } from 'vitest';
import { lastActivity, buildHeatmap, highlights } from './insights';
import { gym, match } from '../test/factory';

describe('lastActivity', () => {
  it('finds the most recent gym and match with days-ago', () => {
    const log = [
      gym('2026-06-15', 'A'),
      gym('2026-06-18', 'B'),
      match('2026-06-17', 'futsal', { goals: 2 }),
    ];
    const la = lastActivity(log, '2026-06-20');
    expect(la.gym?.entry.session).toBe('B');
    expect(la.gym?.daysAgo).toBe(2);
    expect(la.match?.daysAgo).toBe(3);
  });

  it('is undefined when nothing logged', () => {
    expect(lastActivity([], '2026-06-20').gym).toBeUndefined();
  });
});

describe('buildHeatmap', () => {
  // Wednesday, so Thu–Sun of the current week are still in the future.
  const grid = buildHeatmap(
    [gym('2026-06-15', 'A', { rating: 3 }), match('2026-06-15', 'football', { rating: 2 })],
    '2026-06-17',
    12,
  );

  it('has weeks × 7 days, ending in the current week', () => {
    expect(grid).toHaveLength(12);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.at(-1)![0]!.date).toBe('2026-06-15'); // Monday of the current week
  });

  it('marks gym and match counts and ratings on the right day', () => {
    const cell = grid.flat().find((d) => d.date === '2026-06-15')!;
    expect(cell.gym).toBe(1);
    expect(cell.match).toBe(1);
    expect(cell.gymRating).toBe(3);
    expect(cell.matchRating).toBe(2);
  });

  it('flags future days in the current week', () => {
    expect(grid.flat().some((d) => d.future)).toBe(true);
  });
});

describe('highlights', () => {
  it('computes totals, best match and longest streak', () => {
    const log = [
      gym('2026-06-01', 'A'),
      gym('2026-06-08', 'B'), // consecutive week
      gym('2026-06-15', 'A'), // consecutive week → streak of 3
      match('2026-06-02', 'football', { goals: 2 }),
      match('2026-06-09', 'futsal', { goals: 5 }),
    ];
    const h = highlights(log);
    expect(h.totalSessions).toBe(3);
    expect(h.totalMatches).toBe(2);
    expect(h.totalTrainings).toBe(0);
    expect(h.totalGoals).toBe(7);
    expect(h.bestMatchGoals).toBe(5);
    expect(h.longestStreakWeeks).toBe(3);
  });

  it('counts training apart from matches', () => {
    const log = [
      match('2026-06-02', 'football', { goals: 2 }),
      match('2026-06-04', 'training'),
      match('2026-06-06', 'training'),
    ];
    const h = highlights(log);
    expect(h.totalMatches).toBe(1);
    expect(h.totalTrainings).toBe(2);
    expect(h.totalGoals).toBe(2);
  });

  it('breaks the streak on a gap week', () => {
    const log = [gym('2026-06-01', 'A'), gym('2026-06-15', 'A')]; // skip 2026-06-08 week
    expect(highlights(log).longestStreakWeeks).toBe(1);
  });
});
