import type { LogEntry } from '../log/types';
import { buildHeatmap, type HeatDay } from '../engine/insights';

function cellClass(d: HeatDay): string {
  if (d.future) return 'bg-surface2/30';
  if (d.gym && d.match) return 'bg-accent ring-1 ring-amber-400';
  if (d.gym) return 'bg-accent';
  if (d.match) return 'bg-amber-400';
  return 'bg-surface2';
}

export function Heatmap({ log, today, weeks = 12 }: { log: LogEntry[]; today: string; weeks?: number }) {
  const grid = buildHeatmap(log, today, weeks);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Last {weeks} weeks
        </span>
        <span className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" /> gym
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" /> match
          </span>
        </span>
      </div>
      <div className="flex justify-between gap-[3px]">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}${day.gym ? ' · gym' : ''}${day.match ? ' · match' : ''}`}
                className={`aspect-square w-full rounded-[2px] ${cellClass(day)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
