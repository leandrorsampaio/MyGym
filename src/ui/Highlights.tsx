import type { LogEntry } from '../log/types';
import { highlights } from '../engine/insights';

function Record({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-center">
      <div className="text-lg font-semibold text-slate-100">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function Highlights({ log }: { log: LogEntry[] }) {
  const h = highlights(log);
  if (h.totalSessions === 0 && h.totalMatches === 0 && h.totalTrainings === 0) return null;

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Highlights</div>
      <div className="grid grid-cols-3 gap-2">
        <Record value={`${h.longestStreakWeeks}w`} label="Longest streak" />
        <Record value={String(h.bestMatchGoals)} label="Best match goals" />
        <Record value={String(h.bestWeekCount)} label="Busiest week" />
        <Record value={String(h.totalSessions)} label="Total sessions" />
        <Record
          value={h.totalTrainings ? `${h.totalMatches}+${h.totalTrainings}` : String(h.totalMatches)}
          label={h.totalTrainings ? 'Matches + training' : 'Total matches'}
        />
        <Record value={String(h.totalGoals)} label="Total goals" />
      </div>
    </div>
  );
}
