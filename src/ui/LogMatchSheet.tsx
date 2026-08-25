import { useState } from 'react';
import type { GarminMetrics, MatchEntry, Rating, Sport } from '../log/types';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { todayISO } from '../lib/clock';
import { fetchGarminMetrics } from '../garmin/api';
import { formatDuration, parseGarminActivityId } from '../garmin/parse';

type MatchFields = Omit<MatchEntry, 'id' | 'kind' | 'updatedAt'>;

export function LogMatchSheet({
  open,
  initial,
  title = 'Log a match',
  submitLabel = 'Log match',
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: Partial<MatchFields>;
  title?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (e: MatchFields) => void;
}) {
  const [sport, setSport] = useState<Sport>(initial?.sport ?? 'football');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [goals, setGoals] = useState(initial?.goals ?? 0);
  const [rating, setRating] = useState<Rating>(initial?.rating ?? 2);
  const [garminUrl, setGarminUrl] = useState(initial?.garminUrl ?? '');
  const [garmin, setGarmin] = useState<GarminMetrics | undefined>(initial?.garmin);
  const [fetching, setFetching] = useState(false);
  const [garminError, setGarminError] = useState<string | null>(null);

  const activityId = parseGarminActivityId(garminUrl);

  const pullGarmin = async () => {
    if (!activityId || fetching) return;
    setFetching(true);
    setGarminError(null);
    try {
      setGarmin(await fetchGarminMetrics(activityId));
    } catch (err) {
      setGarmin(undefined);
      setGarminError((err as Error).message);
    } finally {
      setFetching(false);
    }
  };

  const submit = () => {
    // Always send both keys so clearing the field clears them on an edit too.
    onSubmit({ date, sport, goals, rating, garminUrl: garminUrl.trim() || undefined, garmin });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['football', 'futsal'] as Sport[]).map((s) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`rounded-lg border py-2 font-medium capitalize ${
                sport === s ? 'border-accent text-accent' : 'border-line text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface2 px-3 py-2"
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Goals</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGoals((g) => Math.max(0, g - 1))}
              className="h-11 w-11 rounded-lg border border-line text-xl"
            >
              −
            </button>
            <span className="w-10 text-center text-2xl font-semibold">{goals}</span>
            <button
              onClick={() => setGoals((g) => g + 1)}
              className="h-11 w-11 rounded-lg border border-line text-xl"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Performance</div>
          <StarRating value={rating} onChange={setRating} />
        </div>

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
              value={garminUrl}
              onChange={(e) => {
                setGarminUrl(e.target.value);
                setGarmin(undefined);
                setGarminError(null);
              }}
              onBlur={() => {
                if (!garmin) void pullGarmin();
              }}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 px-3 py-2 text-sm"
            />
            <button
              onClick={() => void pullGarmin()}
              disabled={!activityId || fetching}
              className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-accent disabled:opacity-40"
            >
              {fetching ? '…' : 'Fetch'}
            </button>
          </div>

          {garmin && (
            <div className="mt-2 rounded-lg bg-accent/10 p-2.5 text-sm text-accent">
              {garmin.name ?? 'Activity'}
              {garmin.durationSec != null && ` · ${formatDuration(garmin.durationSec)}`}
              {!!garmin.distanceM && ` · ${(garmin.distanceM / 1000).toFixed(2)} km`}
            </div>
          )}
          {garminError && (
            <div className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">{garminError}</div>
          )}
          {garminUrl.trim() && !activityId && !garminError && (
            <div className="mt-2 text-xs text-slate-500">
              Expecting a link like connect.garmin.com/app/activity/…
            </div>
          )}
        </div>

        <button onClick={submit} className="w-full rounded-xl bg-accent py-3 font-semibold text-bg active:bg-accentDim">
          {submitLabel}
        </button>
      </div>
    </Sheet>
  );
}
