import { useMemo, useState } from 'react';
import { formatDuration } from '../garmin/parse';
import type { LogEntry, Sport } from '../log/types';
import { isGym, isMatchSport, sportIcon } from '../log/types';
import { isoWeekday } from '../engine/dates';

/**
 * The complete record, newest first, narrowed by kind.
 *
 * Rows carry no edit or delete control: with one on every row the whole list read as
 * dangerous, and both belong to a single entry you have deliberately opened. They live in
 * the detail sheet instead.
 */
type Filter = 'all' | 'gym' | Sport;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gym', label: 'Gym' },
  { key: 'football', label: 'Football' },
  { key: 'futsal', label: 'Futsal' },
  { key: 'training', label: 'Training' },
];

function matchesFilter(e: LogEntry, f: Filter): boolean {
  if (f === 'all') return true;
  if (f === 'gym') return isGym(e);
  return !isGym(e) && e.sport === f;
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${WD[isoWeekday(iso) - 1]} ${Number(d)} ${MO[Number(m) - 1]}`;
}
function monthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  return `${FULL[Number(m) - 1]} ${y}`;
}
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function HistoryView({
  log,
  onOpen,
}: {
  log: LogEntry[];
  onOpen: (entry: LogEntry) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  // Newest first, grouped by month.
  const groups = useMemo(() => {
    const sorted = log
      .filter((e) => matchesFilter(e, filter))
      .sort((a, b) =>
        a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.updatedAt < b.updatedAt ? 1 : -1,
      );
    const out: { month: string; entries: LogEntry[] }[] = [];
    for (const e of sorted) {
      const month = monthLabel(e.date);
      const last = out[out.length - 1];
      if (last && last.month === month) last.entries.push(e);
      else out.push({ month, entries: [e] });
    }
    return out;
  }, [log, filter]);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">History</h2>
        <span className="text-xs text-slate-500">{log.length} entries</span>
      </div>

      {/* Horizontal so five filters fit a phone without wrapping into two rows. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              filter === f.key
                ? 'border-accent bg-surface2 text-accent'
                : 'border-line text-slate-300 hover:border-slate-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          {log.length === 0 ? 'No activity logged yet.' : 'Nothing logged in this category yet.'}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.month} className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {group.month}
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            {group.entries.map((e, i) => (
              <button
                key={e.id}
                onClick={() => onOpen(e)}
                className={`flex w-full items-center gap-3 bg-surface px-3 py-2.5 text-left hover:bg-surface2 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <span className="text-lg">{isGym(e) ? '🏋️' : sportIcon(e.sport)}</span>
                <span className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-100">
                    {isGym(e) ? (
                      <>
                        Session {e.session}
                        <span className="text-slate-500">
                          {' · '}
                          {e.completion === 'complete' ? 'Complete' : 'T1 only'}
                          {e.session === 'C' && e.cType ? ` · ${e.cType}` : ''}
                          {e.legAppend ? ' · +legs' : ''}
                        </span>
                      </>
                    ) : (
                      <span>
                        <span className="capitalize">{e.sport}</span>
                        <span className="text-slate-500">
                          {isMatchSport(e.sport) && ` · ${e.goals} ${e.goals === 1 ? 'goal' : 'goals'}`}
                          {e.garmin?.durationSec != null && ` · ${formatDuration(e.garmin.durationSec)}`}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{dayLabel(e.date)}</div>
                </span>
                <span className="text-xs text-amber-400">{stars(e.rating)}</span>
                <span className="text-slate-600">›</span>
              </button>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}
