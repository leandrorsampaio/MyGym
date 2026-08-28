import { describe, it, expect } from 'vitest';
import { shapeGarminMetrics, shapeSeries, isThinGarmin, SERIES_MAX_POINTS } from './shape';
import activity from './fixtures/activity.json';
import zones from './fixtures/zones.json';
import details from './fixtures/details.json';

// Real payloads captured from Garmin Connect for activity 24101714769 (an 80-minute
// football match). `details.json` is trimmed to its first 300 of 4,815 samples.
const FETCHED = '2026-08-28T20:00:00.000Z';
const shaped = shapeGarminMetrics(activity, zones, details, FETCHED);

describe('shapeGarminMetrics', () => {
  it('reads the summary Garmin shows on the activity page', () => {
    expect(shaped).toMatchObject({
      activityId: '24101714769',
      name: 'Timed Activity',
      type: 'soccer',
      durationSec: 4816,
      calories: 856,
      avgHr: 138,
      maxHr: 174,
      aerobicTrainingEffect: 4.1,
      anaerobicTrainingEffect: 2.5,
      trainingEffectLabel: 'LACTATE_THRESHOLD',
      exerciseLoad: 186,
      moderateIntensityMinutes: 19,
      vigorousIntensityMinutes: 56,
      bodyBatteryDelta: -15,
      sweatLossMl: 481,
      fetchedAt: FETCHED,
    });
  });

  it('keeps the five HR zones in order, with their time', () => {
    expect(shaped.hrZones).toEqual([
      { zone: 1, lowBpm: 91, seconds: 302 },
      { zone: 2, lowBpm: 109, seconds: 1194 },
      { zone: 3, lowBpm: 127, seconds: 1260 },
      { zone: 4, lowBpm: 146, seconds: 1647 },
      { zone: 5, lowBpm: 164, seconds: 401 },
    ]);
  });

  it('zone seconds account for the activity duration', () => {
    const inZones = shaped.hrZones!.reduce((a, z) => a + z.seconds, 0);
    // Garmin drops a few seconds below zone 1; anything close is right.
    expect(Math.abs(inZones - shaped.durationSec!)).toBeLessThan(30);
  });

  it('drops keys Garmin did not report rather than storing nulls', () => {
    // This device has no GPS, so distance is a real 0 — but nothing should be undefined.
    expect(shaped.distanceM).toBe(0);
    expect(Object.values(shaped).every((v) => v !== undefined)).toBe(true);
  });
});

describe('shapeSeries', () => {
  it('downsamples to at most the cap, keeping HR and body battery', () => {
    const series = shaped.series!;
    expect(series.length).toBeLessThanOrEqual(SERIES_MAX_POINTS);
    expect(series.length).toBeGreaterThan(10);
    expect(series[0]).toHaveProperty('hr');
    expect(series[0]).toHaveProperty('bodyBattery');
  });

  it('starts at zero and never goes backwards in time', () => {
    const series = shaped.series!;
    expect(series[0]!.t).toBe(0);
    for (let i = 1; i < series.length; i++) expect(series[i]!.t).toBeGreaterThan(series[i - 1]!.t);
  });

  it('keeps heart rate within the activity min/max', () => {
    for (const s of shaped.series!) {
      expect(s.hr!).toBeGreaterThanOrEqual(shaped.minHr!);
      expect(s.hr!).toBeLessThanOrEqual(shaped.maxHr!);
    }
  });

  it('looks columns up by key, not by array position', () => {
    // Same data, descriptors shuffled — the result must be identical.
    const shuffled = {
      ...details,
      metricDescriptors: [...details.metricDescriptors].reverse(),
    };
    expect(shapeSeries(shuffled)).toEqual(shapeSeries(details));
  });

  it('returns undefined when the details document is missing or empty', () => {
    expect(shapeSeries(null)).toBeUndefined();
    expect(shapeSeries({ metricDescriptors: [], activityDetailMetrics: [] })).toBeUndefined();
  });
});

describe('a summary-only fetch', () => {
  it('still shapes, just without zones or a curve', () => {
    const out = shapeGarminMetrics(activity, null, null, FETCHED);
    expect(out.avgHr).toBe(138);
    expect(out.hrZones).toBeUndefined();
    expect(out.series).toBeUndefined();
  });
});

describe('isThinGarmin', () => {
  it('is true when nothing has been fetched', () => {
    expect(isThinGarmin(undefined)).toBe(true);
  });

  it('is true for the old Open Graph summary — that is what needs upgrading', () => {
    expect(
      isThinGarmin({
        activityId: '1',
        name: 'Timed Activity',
        durationSec: 4816,
        distanceM: 0,
        fetchedAt: 'now',
      }),
    ).toBe(true);
  });

  it('is false once a full render has landed', () => {
    expect(isThinGarmin(shaped)).toBe(false);
  });

  it('is false for a summary-only render, which still has real numbers', () => {
    const summaryOnly = shapeGarminMetrics(activity, null, null, FETCHED);
    expect(summaryOnly.hrZones).toBeUndefined();
    expect(isThinGarmin(summaryOnly)).toBe(false);
  });
});
