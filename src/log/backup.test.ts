import { describe, it, expect } from 'vitest';
import { backupFilename, buildBackup, parseBackup } from './backup';
import type { LogEntry } from './types';

const gym: LogEntry = {
  id: 'g1', kind: 'gym', date: '2026-08-20', session: 'A',
  completion: 'complete', rating: 2, slot3: 'Side Plank',
  updatedAt: '2026-08-20T18:00:00.000Z',
};
const match: LogEntry = {
  id: 'm1', kind: 'match', date: '2026-08-24', sport: 'football', goals: 1, rating: 3,
  garminUrl: 'https://connect.garmin.com/app/activity/24101714769',
  garmin: { activityId: '24101714769', name: 'Timed Activity', durationSec: 4816, distanceM: 0,
            fetchedAt: '2026-08-25T20:00:00.000Z' },
  updatedAt: '2026-08-24T21:00:00.000Z',
};

const training: LogEntry = {
  id: 'm2', kind: 'match', date: '2026-08-26', sport: 'training', goals: 0, rating: 2,
  updatedAt: '2026-08-26T21:00:00.000Z',
};

describe('buildBackup', () => {
  it('wraps the log with a count and timestamp', () => {
    const b = buildBackup([gym, match], '2026-08-25T22:00:00.000Z');
    expect(b).toMatchObject({ app: 'mygym', kind: 'activity-log', count: 2 });
    expect(b.entries).toHaveLength(2);
  });

  it('names the file by date', () => {
    expect(backupFilename('2026-08-25T22:00:00.000Z')).toBe('mygym-log-2026-08-25.json');
  });
});

describe('parseBackup', () => {
  it('round-trips what buildBackup writes, Garmin fields included', () => {
    const json = JSON.parse(JSON.stringify(buildBackup([gym, match], '2026-08-25T22:00:00.000Z')));
    const res = parseBackup(json);
    expect(res).toEqual({ entries: [gym, match] });
  });

  it('accepts a bare array of entries', () => {
    expect(parseBackup([gym])).toEqual({ entries: [gym] });
  });

  it('names a program file for what it is', () => {
    const res = parseBackup({ version: 'v6', workouts: {}, athleticPrep: [], coreFinisher: [] });
    expect(res).toEqual({ error: expect.stringContaining('training program') });
  });

  it('rejects entries with a bad shape', () => {
    const res = parseBackup([{ ...gym, date: '20-08-2026' }]);
    expect(res).toHaveProperty('error');
    expect((res as { error: string }).error).toContain('YYYY-MM-DD');
  });

  it('rejects junk', () => {
    expect(parseBackup('nope')).toHaveProperty('error');
    expect(parseBackup(null)).toHaveProperty('error');
  });

  it('keeps an empty log valid', () => {
    expect(parseBackup(buildBackup([], '2026-08-25T22:00:00.000Z'))).toEqual({ entries: [] });
  });
});

describe('training entries', () => {
  it('round-trips through a backup', () => {
    const b = buildBackup([training], '2026-08-26T22:00:00.000Z');
    const parsed = parseBackup(JSON.parse(JSON.stringify(b)));
    expect(parsed).toEqual({ entries: [training] });
  });

  it('rejects a sport outside the three', () => {
    const bad = { ...training, sport: 'tennis' };
    const parsed = parseBackup([bad]);
    expect(parsed).toHaveProperty('error');
  });
});

describe('a gym session with Garmin data', () => {
  const gymWithGarmin: LogEntry = {
    id: 'g9', kind: 'gym', date: '2026-08-27', session: 'B',
    completion: 'complete', rating: 3, slot3: 'side',
    garminUrl: 'https://connect.garmin.com/app/activity/24101714769',
    garmin: {
      activityId: '24101714769', name: 'Strength', avgHr: 118, maxHr: 152, calories: 402,
      exerciseLoad: 88, hrZones: [{ zone: 1, lowBpm: 91, seconds: 600 }],
      series: [{ t: 0, hr: 95 }, { t: 30, hr: 118 }],
      fetchedAt: '2026-08-27T19:00:00.000Z',
    },
    updatedAt: '2026-08-27T18:00:00.000Z',
  };

  it('round-trips through a backup', () => {
    const b = buildBackup([gymWithGarmin], '2026-08-27T22:00:00.000Z');
    expect(parseBackup(JSON.parse(JSON.stringify(b)))).toEqual({ entries: [gymWithGarmin] });
  });
});
