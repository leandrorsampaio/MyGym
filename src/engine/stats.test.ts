import { describe, it, expect } from 'vitest';
import { gymStats, footballStats, consistency } from './stats';
import { gym, match } from '../test/factory';

describe('gymStats', () => {
  it('counts sessions, completion split and average rating', () => {
    const log = [
      gym('2026-06-01', 'A', { completion: 'complete', rating: 3 }),
      gym('2026-06-03', 'B', { completion: 't1', rating: 1 }),
      gym('2026-06-05', 'A', { completion: 'complete', rating: 2 }),
    ];
    const s = gymStats(log);
    expect(s.total).toBe(3);
    expect(s.bySession).toEqual({ A: 2, B: 1, C: 0 });
    expect(s.complete).toBe(2);
    expect(s.t1Only).toBe(1);
    expect(s.avgRating).toBe(2);
  });
});

describe('footballStats', () => {
  it('aggregates matches, goals and ratings', () => {
    const log = [
      match('2026-06-01', 'football', { goals: 2, rating: 3 }),
      match('2026-06-08', 'futsal', { goals: 4, rating: 2 }),
    ];
    const s = footballStats(log);
    expect(s.matches).toBe(2);
    expect(s.bySport).toEqual({ football: 1, futsal: 1 });
    expect(s.totalGoals).toBe(6);
    expect(s.goalsPerMatch).toBe(3);
    expect(s.avgRating).toBe(2.5);
  });

  it('handles an empty log without dividing by zero', () => {
    const s = footballStats([]);
    expect(s.goalsPerMatch).toBe(0);
    expect(s.avgRating).toBe(0);
  });
});

describe('consistency', () => {
  it('counts this-week activity and a multi-week streak', () => {
    const log = [
      gym('2026-06-15', 'A'), // W25 (this week)
      match('2026-06-18', 'futsal'), // W25
      gym('2026-06-08', 'B'), // W24
      gym('2026-06-01', 'A'), // W23
    ];
    const c = consistency(log, '2026-06-19');
    expect(c.thisWeek).toBe(2);
    expect(c.streakWeeks).toBe(3); // W25, W24, W23
  });

  it('a gap ends the streak', () => {
    const log = [
      gym('2026-06-15', 'A'), // W25
      // W24 empty
      gym('2026-06-01', 'A'), // W23
    ];
    const c = consistency(log, '2026-06-19');
    expect(c.streakWeeks).toBe(1);
  });

  it('avgPerWeek averages over the trailing window incl. empty weeks', () => {
    const log = [gym('2026-06-15', 'A'), gym('2026-06-16', 'B')];
    const c = consistency(log, '2026-06-19', 4);
    expect(c.avgPerWeek).toBe(0.5); // 2 activities / 4 weeks
  });
});
