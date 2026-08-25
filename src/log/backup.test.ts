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
