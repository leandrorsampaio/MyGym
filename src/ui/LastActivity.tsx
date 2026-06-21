import type { LogEntry } from '../log/types';
import { lastActivity } from '../engine/insights';

function ago(n: number): string {
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n}d ago`;
}

export function LastActivity({ log, today }: { log: LogEntry[]; today: string }) {
  const { gym, match } = lastActivity(log, today);
  if (!gym && !match) return null;

  return (
    <div className="flex gap-2 text-sm">
      <div className="flex-1 rounded-xl border border-line bg-surface px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Last gym</div>
        {gym ? (
          <div className="text-slate-200">
            Session {gym.entry.session}
            <span className="text-slate-500"> · {ago(gym.daysAgo)}</span>
            <span className="ml-1 text-amber-400">{'★'.repeat(gym.entry.rating)}</span>
          </div>
        ) : (
          <div className="text-slate-500">—</div>
        )}
      </div>
      <div className="flex-1 rounded-xl border border-line bg-surface px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Last match</div>
        {match ? (
          <div className="text-slate-200 capitalize">
            {match.entry.sport}
            <span className="text-slate-500"> · {ago(match.daysAgo)}</span>
            <span className="ml-1 text-slate-400">⚽{match.entry.goals}</span>
          </div>
        ) : (
          <div className="text-slate-500">—</div>
        )}
      </div>
    </div>
  );
}
