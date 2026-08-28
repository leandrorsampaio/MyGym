import { useMemo, useState } from 'react';
import { formatDuration } from '../garmin/parse';
import type { LogEntry } from '../log/types';
import { isGym, isMatchSport, sportIcon } from '../log/types';
import { isoWeekday } from '../engine/dates';
import { ConfirmDialog } from './ConfirmDialog';

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
  onBack,
  onEdit,
  onOpen,
  onDelete,
}: {
  log: LogEntry[];
  onBack: () => void;
  onEdit: (entry: LogEntry) => void;
  onOpen: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<LogEntry | null>(null);

  // Newest first, grouped by month.
  const groups = useMemo(() => {
    const sorted = [...log].sort((a, b) =>
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
  }, [log]);

  return (
    <div className="pb-10 md:mx-auto md:max-w-3xl">
      <div className="flex items-center justify-between py-1">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-100">
          ← Home
        </button>
        <span className="text-sm text-slate-500">{log.length} entries</span>
      </div>
      <h1 className="mb-3 mt-1 text-2xl font-bold">Activity history</h1>

      {log.length === 0 && <p className="text-slate-500">No activity logged yet.</p>}

      {groups.map((group) => (
        <div key={group.month} className="mb-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {group.month}
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            {group.entries.map((e, i) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 bg-surface px-3 py-2.5 hover:bg-surface2 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <span className="text-lg">{isGym(e) ? '🏋️' : sportIcon(e.sport)}</span>
                <button onClick={() => onOpen(e)} className="min-w-0 flex-1 text-left">
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
                      <span className="capitalize">
                        {e.sport}
                        <span className="text-slate-500">
                          {isMatchSport(e.sport) && ` · ${e.goals} ${e.goals === 1 ? 'goal' : 'goals'}`}
                          {e.garmin?.durationSec != null && ` · ${formatDuration(e.garmin.durationSec)}`}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{dayLabel(e.date)}</div>
                </button>
                <span className="text-xs text-amber-400">{stars(e.rating)}</span>
                <button
                  onClick={() => onEdit(e)}
                  aria-label="Edit entry"
                  className="px-1 text-slate-500 hover:text-accent active:text-accent"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setPendingDelete(e)}
                  aria-label="Delete entry"
                  className="px-1 text-slate-600 hover:text-red-400 active:text-red-400"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this entry?"
        message={
          pendingDelete
            ? `${isGym(pendingDelete) ? `Session ${pendingDelete.session}` : pendingDelete.sport} on ${dayLabel(
                pendingDelete.date,
              )}. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
