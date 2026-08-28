import { useMemo, useRef, useState } from 'react';
import type { LogEntry } from '../log/types';
import { backfillCandidates, runBackfill, type BackfillProgress } from '../garmin/backfill';
import { fetchGarminMetrics } from '../garmin/api';

/**
 * "You have activities we could fetch" — with a button that fetches them.
 *
 * Lives on Progress because that is where the gap is felt: every panel here is only as
 * good as the history behind it. Hidden entirely when there is nothing to catch up on.
 */
export function GarminBackfill({
  log,
  onEntry,
  onDone,
}: {
  log: LogEntry[];
  onEntry: (entry: LogEntry) => void;
  onDone?: () => void;
}) {
  const candidates = useMemo(() => backfillCandidates(log), [log]);
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [finished, setFinished] = useState<BackfillProgress | null>(null);
  const stopped = useRef(false);

  const running = progress !== null && finished === null;
  if (candidates.length === 0 && !running && !finished) return null;

  const start = async () => {
    stopped.current = false;
    setFinished(null);
    const result = await runBackfill(candidates, {
      fetchOne: fetchGarminMetrics,
      onEntry,
      onProgress: setProgress,
      shouldStop: () => stopped.current,
    });
    setFinished(result);
    onDone?.();
  };

  const pct = progress && progress.total ? ((progress.done + progress.failed) / progress.total) * 100 : 0;

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 md:col-span-2">
      {finished ? (
        <div className="text-sm text-slate-300">
          Fetched {finished.done} of {finished.total}.
          {finished.failed > 0 && (
            <span className="text-slate-500">
              {' '}
              {finished.failed} didn't come back — they may not be shared publicly. Try again later.
            </span>
          )}
        </div>
      ) : running ? (
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-slate-300">
              Fetching {progress!.done + progress!.failed + 1} of {progress!.total}
              {progress!.current && <span className="text-slate-500"> · {progress!.current}</span>}
            </span>
            <button onClick={() => (stopped.current = true)} className="text-xs text-slate-400 hover:text-slate-100">
              Stop
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Each one renders the Garmin page server-side, so this takes ~15s apiece. You can leave
            the page — it keeps going while the app is open.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            {candidates.length} activit{candidates.length === 1 ? 'y has' : 'ies have'} a Garmin link but
            no data yet.
            <span className="block text-xs text-slate-500">
              Fetching them fills in the charts above.
            </span>
          </div>
          <button
            onClick={() => void start()}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accentDim"
          >
            Fetch them all
          </button>
        </div>
      )}
    </div>
  );
}
