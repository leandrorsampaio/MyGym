import { describe, it, expect, vi } from 'vitest';
import { backfillCandidates, runBackfill } from './backfill';
import { gym, match } from '../test/factory';
import type { GarminMetrics, LogEntry } from '../log/types';

const URL_A = 'https://connect.garmin.com/app/activity/24101714769';
const full = (id = '1'): GarminMetrics => ({
  activityId: id,
  avgHr: 138,
  hrZones: [{ zone: 4, seconds: 100 }],
  fetchedAt: 'now',
});
const thin = (id = '1'): GarminMetrics => ({ activityId: id, name: 'Timed Activity', fetchedAt: 'old' });

describe('backfillCandidates', () => {
  it('picks entries with a link and nothing real behind it, newest first', () => {
    const log: LogEntry[] = [
      match('2026-06-01', 'football', { garminUrl: URL_A }),
      match('2026-07-01', 'football', { garminUrl: URL_A, garmin: thin() }),
      match('2026-08-01', 'football', { garminUrl: URL_A, garmin: full() }), // already done
      match('2026-08-02', 'football'), // no link
      gym('2026-07-15', 'A', { garminUrl: URL_A }),
    ];
    expect(backfillCandidates(log).map((e) => e.date)).toEqual(['2026-07-15', '2026-07-01', '2026-06-01']);
  });

  it('is empty when everything is already fetched', () => {
    expect(backfillCandidates([match('2026-08-01', 'football', { garminUrl: URL_A, garmin: full() })])).toEqual([]);
  });
});

describe('runBackfill', () => {
  const entries = [
    match('2026-08-01', 'football', { garminUrl: URL_A }),
    match('2026-08-08', 'football', { garminUrl: URL_A }),
  ];

  it('fetches each entry once and hands back the updated one', async () => {
    const onEntry = vi.fn();
    const fetchOne = vi.fn(async () => full());
    const p = await runBackfill(entries, { fetchOne, onEntry, wait: async () => {} });
    expect(fetchOne).toHaveBeenCalledTimes(2);
    expect(onEntry).toHaveBeenCalledTimes(2);
    expect(onEntry.mock.calls[0]![0].garmin.avgHr).toBe(138);
    expect(p).toMatchObject({ done: 2, failed: 0, total: 2 });
  });

  it('retries a refused fetch before giving up', async () => {
    let calls = 0;
    const fetchOne = vi.fn(async () => {
      if (++calls < 3) throw new Error('no browser available');
      return full();
    });
    const p = await runBackfill([entries[0]!], { fetchOne, onEntry: () => {}, wait: async () => {} });
    expect(calls).toBe(3);
    expect(p).toMatchObject({ done: 1, failed: 0 });
  });

  it('records a failure and carries on to the next entry', async () => {
    const fetchOne = vi.fn(async (id: string) => {
      if (fetchOne.mock.calls.length <= 3) throw new Error('nope');
      return full(id);
    });
    const p = await runBackfill(entries, { fetchOne, onEntry: () => {}, wait: async () => {}, attempts: 3 });
    expect(p).toMatchObject({ done: 1, failed: 1, total: 2 });
  });

  it('backs off further on each retry', async () => {
    const waits: number[] = [];
    await runBackfill([entries[0]!], {
      fetchOne: async () => {
        throw new Error('rate limited');
      },
      onEntry: () => {},
      wait: async (ms) => {
        waits.push(ms);
      },
      attempts: 3,
      backoffMs: 1000,
    });
    expect(waits).toEqual([1000, 2000]);
  });

  it('stops when asked, leaving the rest untouched', async () => {
    const fetchOne = vi.fn(async () => full());
    let stop = false;
    const p = await runBackfill(entries, {
      fetchOne,
      onEntry: () => {
        stop = true;
      },
      wait: async () => {},
      shouldStop: () => stop,
    });
    expect(fetchOne).toHaveBeenCalledTimes(1);
    expect(p.done).toBe(1);
  });

  it('reports progress as it goes', async () => {
    const seen: number[] = [];
    await runBackfill(entries, {
      fetchOne: async () => full(),
      onEntry: () => {},
      wait: async () => {},
      onProgress: (p) => seen.push(p.done),
    });
    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(2);
  });
});
