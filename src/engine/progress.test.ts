import { describe, it, expect } from 'vitest';
import {
  activityPoints,
  goalTrend,
  loadRamp,
  secondsAtOrAbove,
  weeklyLoad,
  TREND_MIN_POINTS,
} from './progress';
import { gym, match } from '../test/factory';
import type { GarminMetrics } from '../log/types';

const garmin = (over: Partial<GarminMetrics> = {}): GarminMetrics => ({
  activityId: 'a1',
  fetchedAt: '2026-08-28T00:00:00.000Z',
  ...over,
});

describe('secondsAtOrAbove', () => {
  const zones = [
    { zone: 1, seconds: 300 },
    { zone: 2, seconds: 1200 },
    { zone: 3, seconds: 1260 },
    { zone: 4, seconds: 1600 },
    { zone: 5, seconds: 400 },
  ];

  it('sums the zones at or above the threshold', () => {
    expect(secondsAtOrAbove(garmin({ hrZones: zones }), 4)).toBe(2000);
    expect(secondsAtOrAbove(garmin({ hrZones: zones }), 1)).toBe(4760);
  });

  it('is undefined when there are no zones, rather than zero', () => {
    // Zero would read as "you did nothing hard"; undefined reads as "we don't know".
    expect(secondsAtOrAbove(garmin(), 4)).toBeUndefined();
    expect(secondsAtOrAbove(undefined, 4)).toBeUndefined();
  });
});

describe('activityPoints', () => {
  it('includes only linked activities, oldest first', () => {
    const log = [
      match('2026-06-10', 'football', { garmin: garmin({ avgHr: 140 }) }),
      match('2026-06-03', 'futsal'), // no garmin → excluded
      gym('2026-06-05', 'A', { garmin: garmin({ avgHr: 110, exerciseLoad: 60 }) }),
    ];
    const pts = activityPoints(log);
    expect(pts.map((p) => p.date)).toEqual(['2026-06-05', '2026-06-10']);
    expect(pts[0]!.kind).toBe('gym');
    expect(pts[1]!.sport).toBe('football');
  });

  it('computes the share of time in zones 4-5', () => {
    const log = [
      match('2026-06-10', 'football', {
        garmin: garmin({
          hrZones: [
            { zone: 1, seconds: 200 },
            { zone: 4, seconds: 600 },
            { zone: 5, seconds: 200 },
          ],
        }),
      }),
    ];
    const p = activityPoints(log)[0]!;
    expect(p.highSec).toBe(800);
    expect(p.highShare).toBeCloseTo(800 / 1000);
  });

  it('measures share against time in zones, not elapsed time', () => {
    // A watch that dropped out would otherwise make a hard session look easy.
    const log = [
      match('2026-06-10', 'football', {
        garmin: garmin({
          durationSec: 6000, // far longer than the zone data covers
          hrZones: [
            { zone: 3, seconds: 100 },
            { zone: 4, seconds: 100 },
          ],
        }),
      }),
    ];
    expect(activityPoints(log)[0]!.highShare).toBeCloseTo(0.5);
  });
});

describe('weeklyLoad', () => {
  it('splits gym and football load by ISO week, newest week last', () => {
    const log = [
      gym('2026-06-15', 'A', { garmin: garmin({ exerciseLoad: 50 }) }),
      match('2026-06-17', 'football', { garmin: garmin({ exerciseLoad: 180 }) }),
      gym('2026-06-22', 'B', { garmin: garmin({ exerciseLoad: 70 }) }),
    ];
    const weeks = weeklyLoad(log, '2026-06-24', 3);
    expect(weeks).toHaveLength(3);
    const last = weeks[weeks.length - 1]!;
    const prev = weeks[weeks.length - 2]!;
    expect(prev.gym).toBe(50);
    expect(prev.football).toBe(180);
    expect(prev.total).toBe(230);
    expect(last.gym).toBe(70);
    expect(last.football).toBe(0);
  });

  it('counts activities separately from the ones carrying load', () => {
    const log = [
      gym('2026-06-15', 'A', { garmin: garmin({ exerciseLoad: 50 }) }),
      gym('2026-06-16', 'B'), // logged but never linked
    ];
    const week = weeklyLoad(log, '2026-06-17', 1)[0]!;
    expect(week.activities).toBe(2);
    expect(week.linked).toBe(1);
    expect(week.total).toBe(50);
  });

  it('keeps empty weeks so the bars keep a steady rhythm', () => {
    const weeks = weeklyLoad([], '2026-06-24', 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.total === 0 && w.activities === 0)).toBe(true);
  });
});

describe('loadRamp', () => {
  it('reports the jump between the last two weeks that have data', () => {
    const weeks = weeklyLoad(
      [
        gym('2026-06-15', 'A', { garmin: garmin({ exerciseLoad: 100 }) }),
        gym('2026-06-22', 'B', { garmin: garmin({ exerciseLoad: 150 }) }),
      ],
      '2026-06-24',
      3,
    );
    expect(loadRamp(weeks)).toBeCloseTo(0.5);
  });

  it('is undefined with fewer than two weeks of data', () => {
    expect(loadRamp(weeklyLoad([], '2026-06-24', 4))).toBeUndefined();
  });
});

describe('goalTrend', () => {
  it('follows matches in order with a rolling average', () => {
    const log = [
      match('2026-06-01', 'football', { goals: 0 }),
      match('2026-06-08', 'football', { goals: 2 }),
      match('2026-06-15', 'futsal', { goals: 4 }),
    ];
    const t = goalTrend(log, 3);
    expect(t.map((p) => p.goals)).toEqual([0, 2, 4]);
    expect(t[2]!.rolling).toBeCloseTo(2);
  });

  it('leaves training out — it has no scoreline to average', () => {
    const log = [
      match('2026-06-01', 'football', { goals: 3 }),
      match('2026-06-04', 'training'),
    ];
    expect(goalTrend(log)).toHaveLength(1);
  });
});

describe('TREND_MIN_POINTS', () => {
  it('is high enough that a line is worth drawing', () => {
    expect(TREND_MIN_POINTS).toBeGreaterThanOrEqual(4);
  });
});
