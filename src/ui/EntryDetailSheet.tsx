import { useEffect, useRef, useState } from 'react';
import type { LogEntry, MatchEntry } from '../log/types';
import { isGym, isMatchSport, sportIcon } from '../log/types';
import { fetchGarminMetrics } from '../garmin/api';
import { isThinGarmin } from '../garmin/shape';
import { parseGarminActivityId } from '../garmin/parse';
import type { Program } from '../program/schema';
import { Sheet } from './Sheet';
import { GarminActivity } from './GarminActivity';

/** Turn a stored rotation key back into the label the program gives it. */
function slot3Label(program: Program, key: string): string {
  const slot = program.coreFinisher.slots.find((s) => s.rotates) ?? program.coreFinisher.slots[2];
  return slot?.options.find((o) => o.key === key)?.name ?? key;
}

function cTypeLabel(program: Program, key: string): string {
  return program.workouts.C.alternates.find((a) => a.key === key)?.label ?? key;
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-right text-sm text-slate-100">{children}</span>
    </div>
  );
}

/**
 * Read-only detail for one log entry.
 *
 * Split in two so the inner component can use hooks with an entry guaranteed present,
 * and so `key` remounts it per entry — which resets the one-shot Garmin fetch below.
 */
export function EntryDetailSheet(props: {
  entry: LogEntry | null;
  program: Program;
  onClose: () => void;
  onEdit: (entry: LogEntry) => void;
  onUpdate?: (entry: LogEntry) => void;
}) {
  if (!props.entry) return null;
  return <EntryDetail {...props} key={props.entry.id} entry={props.entry} />;
}

/**
 * Fetch an activity's Garmin data when the entry is opened, if we don't already have it.
 *
 * Opening a match is exactly the moment you want the numbers, so going and getting them
 * is the app's job — not something to leave behind an Edit button. One attempt per open:
 * if the server can only reach the thin fallback, retrying on every render would spend
 * browser-rendering time to no purpose.
 */
function useGarminBackfill(
  entry: LogEntry,
  onUpdate?: (entry: LogEntry) => void,
): { loading: boolean; error: string | null; retry: () => void } {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  const match = isGym(entry) ? null : (entry as MatchEntry);
  const activityId = parseGarminActivityId(match?.garminUrl ?? match?.garmin?.activityId ?? '');
  const wanted = !!match && !!activityId && isThinGarmin(match.garmin);

  const run = () => {
    if (!match || !activityId || loading) return;
    tried.current = true;
    setLoading(true);
    setError(null);
    fetchGarminMetrics(activityId)
      .then((garmin) => onUpdate?.({ ...match, garmin }))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (wanted && !tried.current) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  return { loading, error, retry: run };
}

function EntryDetail({
  entry,
  program,
  onClose,
  onEdit,
  onUpdate,
}: {
  entry: LogEntry;
  program: Program;
  onClose: () => void;
  onEdit: (entry: LogEntry) => void;
  onUpdate?: (entry: LogEntry) => void;
}) {
  const gym = isGym(entry);
  const { loading, error, retry } = useGarminBackfill(entry, onUpdate);

  return (
    <Sheet
      open
      onClose={onClose}
      title={gym ? `Session ${entry.session}` : isMatchSport(entry.sport) ? 'Match' : 'Training'}
    >
      <div className="space-y-4">
        <div>
          <div className="text-lg font-semibold capitalize text-slate-100">
            {gym ? `${'🏋️'} Session ${entry.session}` : `${sportIcon(entry.sport)} ${entry.sport}`}
          </div>
          <div className="text-sm text-slate-500">{longDate(entry.date)}</div>
        </div>

        <div className="divide-y divide-line rounded-xl border border-line px-3">
          {gym ? (
            <>
              <Row label="Completion">{entry.completion === 'complete' ? 'Complete' : 'T1 only'}</Row>
              {entry.session === 'C' && entry.cType && (
                <Row label="Conditioning">{cTypeLabel(program, entry.cType)}</Row>
              )}
              {entry.slot3 && <Row label="Core slot-3">{slot3Label(program, entry.slot3)}</Row>}
              {entry.legAppend && <Row label="Extra">Squat 2×5 + RDL 2×8</Row>}
            </>
          ) : (
            isMatchSport(entry.sport) && <Row label="Goals">{entry.goals}</Row>
          )}
          <Row label="Performance">
            <span className="text-amber-400">
              {'★'.repeat(entry.rating)}
              <span className="text-slate-600">{'☆'.repeat(3 - entry.rating)}</span>
            </span>
          </Row>
        </div>

        {!gym && (entry.garmin || entry.garminUrl) && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Garmin</span>
              {entry.garmin?.name && <span className="text-sm text-slate-400">{entry.garmin.name}</span>}
            </div>

            {entry.garmin && <GarminActivity garmin={entry.garmin} />}

            {loading && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2/40 px-3 py-3 text-sm text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-accent" />
                Reading the activity from Garmin…
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                <div>{error}</div>
                <button onClick={retry} className="mt-2 rounded-lg border border-red-400/40 px-2.5 py-1 text-red-200 hover:bg-red-500/10">
                  Try again
                </button>
              </div>
            )}

            {!entry.garmin && !loading && !error && (
              <p className="text-xs text-slate-500">No activity data for this one yet.</p>
            )}

            {entry.garminUrl && (
              <a
                href={entry.garminUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-line py-2.5 text-center text-sm text-accent hover:border-slate-500 hover:bg-surface2"
              >
                Open in Garmin Connect ↗
              </a>
            )}
          </div>
        )}

        <button
          onClick={() => onEdit(entry)}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-bg hover:bg-accentDim active:bg-accentDim"
        >
          Edit
        </button>
      </div>
    </Sheet>
  );
}
