/**
 * Garmin's raw activity DTOs → the `GarminMetrics` we store.
 *
 * Garmin's own web app fetches three JSON documents for an activity page:
 *   /activity/{id}                 the summary (summaryDTO)
 *   /activity/{id}/hrTimeInZones   seconds in each HR zone
 *   /activity/{id}/details         the 1 Hz time series (~5k samples for a match)
 *
 * We capture those verbatim (see the browser worker) and reshape them here rather than
 * scraping rendered labels, so we inherit Garmin's own field names and survive UI changes.
 *
 * Pure and clock-free — `fetchedAt` is passed in, like everything in `engine/`. That is
 * what makes this testable against real captured payloads.
 */
import type { GarminHrZone, GarminMetrics, GarminSample } from '../log/types';

/** Cap on stored series points. ~5k 1 Hz samples per match is far more than a chart needs. */
export const SERIES_MAX_POINTS = 200;

/** Garmin sends plenty of nulls and long floats; keep numbers or drop the key entirely. */
function num(v: unknown, decimals = 0): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Number(v.toFixed(decimals));
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

function shapeZones(zones: unknown): GarminHrZone[] | undefined {
  if (!Array.isArray(zones)) return undefined;
  const out: GarminHrZone[] = [];
  for (const z of zones) {
    const zone = num((z as Record<string, unknown>)?.zoneNumber);
    const seconds = num((z as Record<string, unknown>)?.secsInZone);
    if (zone == null || seconds == null) continue;
    const lowBpm = num((z as Record<string, unknown>)?.zoneLowBoundary);
    out.push(lowBpm == null ? { zone, seconds } : { zone, lowBpm, seconds });
  }
  return out.length ? out.sort((a, b) => a.zone - b.zone) : undefined;
}

/**
 * The details document is a column store: `metricDescriptors` names each column and
 * `activityDetailMetrics[].metrics` holds the row values positionally. We look the
 * columns up by key rather than by index, because the set varies by device.
 *
 * Downsampled into at most `SERIES_MAX_POINTS` buckets, averaging within each bucket so
 * the curve is smooth rather than whatever the sampled instant happened to read.
 */
export function shapeSeries(details: unknown, maxPoints = SERIES_MAX_POINTS): GarminSample[] | undefined {
  const d = details as { metricDescriptors?: unknown; activityDetailMetrics?: unknown } | null;
  const descriptors = Array.isArray(d?.metricDescriptors) ? d.metricDescriptors : null;
  const rows = Array.isArray(d?.activityDetailMetrics) ? d.activityDetailMetrics : null;
  if (!descriptors || !rows || rows.length === 0) return undefined;

  const indexOf = (key: string): number | undefined => {
    const hit = descriptors.find((x) => (x as Record<string, unknown>)?.key === key);
    const i = num((hit as Record<string, unknown>)?.metricsIndex);
    return i;
  };
  const tIdx = indexOf('sumElapsedDuration') ?? indexOf('sumDuration');
  const hrIdx = indexOf('directHeartRate');
  const bbIdx = indexOf('directBodyBattery');
  if (tIdx == null) return undefined;

  const bucketSize = Math.ceil(rows.length / maxPoints);
  const out: GarminSample[] = [];

  for (let start = 0; start < rows.length; start += bucketSize) {
    const bucket = rows.slice(start, start + bucketSize);
    const values = bucket
      .map((r) => (r as { metrics?: unknown })?.metrics)
      .filter((m): m is number[] => Array.isArray(m));
    if (values.length === 0) continue;

    const mean = (idx: number | undefined): number | undefined => {
      if (idx == null) return undefined;
      const nums = values.map((m) => m[idx]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (nums.length === 0) return undefined;
      return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    };

    // Time is the bucket's first sample, so the curve starts at 0 and stays monotonic.
    const t = num(values[0]?.[tIdx]);
    if (t == null) continue;
    const sample: GarminSample = { t };
    const hr = mean(hrIdx);
    if (hr != null) sample.hr = hr;
    const bb = mean(bbIdx);
    if (bb != null) sample.bodyBattery = bb;
    out.push(sample);
  }

  return out.length ? out : undefined;
}

/** Drop undefined keys so stored entries (and the JSON backup) stay tidy. */
function compact<T extends object>(obj: T): T {
  for (const k of Object.keys(obj) as (keyof T)[]) if (obj[k] === undefined) delete obj[k];
  return obj;
}

export function shapeGarminMetrics(
  activity: unknown,
  zones: unknown,
  details: unknown,
  fetchedAt: string,
): GarminMetrics {
  const a = (activity ?? {}) as Record<string, any>;
  const s = (a.summaryDTO ?? {}) as Record<string, unknown>;

  return compact<GarminMetrics>({
    activityId: String(a.activityId ?? ''),
    name: str(a.activityName),
    type: str(a.activityTypeDTO?.typeKey),
    startTimeLocal: str(s.startTimeLocal),

    durationSec: num(s.duration),
    movingDurationSec: num(s.movingDuration),
    distanceM: num(s.distance),
    steps: num(s.steps),

    calories: num(s.calories),
    restingCalories: num(s.bmrCalories),

    avgHr: num(s.averageHR),
    maxHr: num(s.maxHR),
    minHr: num(s.minHR),

    aerobicTrainingEffect: num(s.trainingEffect, 1),
    anaerobicTrainingEffect: num(s.anaerobicTrainingEffect, 1),
    trainingEffectLabel: str(s.trainingEffectLabel),
    aerobicTrainingEffectMessage: str(s.aerobicTrainingEffectMessage),
    anaerobicTrainingEffectMessage: str(s.anaerobicTrainingEffectMessage),

    exerciseLoad: num(s.activityTrainingLoad),
    moderateIntensityMinutes: num(s.moderateIntensityMinutes),
    vigorousIntensityMinutes: num(s.vigorousIntensityMinutes),
    bodyBatteryDelta: num(s.differenceBodyBattery),
    sweatLossMl: num(s.waterEstimated),

    hrZones: shapeZones(zones),
    series: shapeSeries(details),

    fetchedAt,
  });
}
