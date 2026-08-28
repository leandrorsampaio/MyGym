import { useState } from 'react';
import type { GarminMetrics } from '../log/types';
import { fetchGarminMetrics } from '../garmin/api';
import { formatDuration, parseGarminActivityId } from '../garmin/parse';

/**
 * Paste a Garmin Connect link and pull the activity. Shared by the workout and match
 * sheets, which both log something you may also have recorded on the watch.
 *
 * Fetching here is optional — the entry saves either way and opening it later will fill
 * the data in. The point of doing it now is the confirmation line, which tells you the
 * link actually resolved before you commit the entry.
 */
export function GarminField({
  url,
  garmin,
  onChange,
}: {
  url: string;
  garmin?: GarminMetrics;
  onChange: (url: string, garmin?: GarminMetrics) => void;
}) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activityId = parseGarminActivityId(url);

  const pull = async () => {
    if (!activityId || fetching) return;
    setFetching(true);
    setError(null);
    try {
      onChange(url, await fetchGarminMetrics(activityId));
    } catch (err) {
      onChange(url, undefined);
      setError((err as Error).message);
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Garmin activity <span className="font-normal normal-case text-slate-600">· optional</span>
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Paste Garmin Connect link"
          value={url}
          onChange={(e) => {
            onChange(e.target.value, undefined);
            setError(null);
          }}
          onBlur={() => {
            if (!garmin) void pull();
          }}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 px-3 py-2 text-sm"
        />
        <button
          onClick={() => void pull()}
          disabled={!activityId || fetching}
          className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-accent hover:border-slate-500 disabled:opacity-40"
        >
          {fetching ? '…' : 'Fetch'}
        </button>
      </div>

      {garmin && (
        <div className="mt-2 rounded-lg bg-accent/10 p-2.5 text-sm text-accent">
          <div>
            {garmin.name ?? 'Activity'}
            {garmin.durationSec != null && ` · ${formatDuration(garmin.durationSec)}`}
            {!!garmin.distanceM && ` · ${(garmin.distanceM / 1000).toFixed(2)} km`}
          </div>
          {/* Only a full render produces these — a glance tells you which one you got. */}
          {(garmin.avgHr != null || garmin.calories != null) && (
            <div className="mt-0.5 text-xs text-accent/70">
              {[
                garmin.avgHr != null && `${garmin.avgHr} bpm avg`,
                garmin.calories != null && `${garmin.calories} cal`,
                garmin.hrZones?.length && 'HR zones',
                garmin.series?.length && 'HR curve',
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
        </div>
      )}
      {error && <div className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">{error}</div>}
      {url.trim() && !activityId && !error && (
        <div className="mt-2 text-xs text-slate-500">
          Expecting a link like connect.garmin.com/app/activity/…
        </div>
      )}
    </div>
  );
}
