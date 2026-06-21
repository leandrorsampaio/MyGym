import type { LogEntry, SessionId } from '../log/types';
import { gymStats } from '../engine/stats';

const ITEMS: { k: SessionId; label: string; bar: string; text: string }[] = [
  { k: 'A', label: 'Upper + Pull', bar: 'bg-accent', text: 'text-accent' },
  { k: 'B', label: 'Lower + Power', bar: 'bg-sky-400', text: 'text-sky-400' },
  { k: 'C', label: 'Conditioning', bar: 'bg-violet-400', text: 'text-violet-400' },
];

/** Lifetime count of A / B / C gym sessions with a proportion bar. */
export function SessionBreakdown({ log }: { log: LogEntry[] }) {
  const g = gymStats(log);
  const total = g.total;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sessions by type</span>
        <span className="text-xs text-slate-500">{total} total</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ITEMS.map((it) => (
          <div key={it.k} className="text-center">
            <div className={`text-3xl font-bold ${it.text}`}>{g.bySession[it.k]}</div>
            <div className="text-sm font-semibold text-slate-200">{it.k}</div>
            <div className="text-[11px] text-slate-500">{it.label}</div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface2">
          {ITEMS.map((it) => (
            <div
              key={it.k}
              className={it.bar}
              style={{ width: `${(g.bySession[it.k] / total) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
