import { useState } from 'react';
import type { LogEntry } from '../log/types';
import { buildHeatmap, type HeatDay } from '../engine/insights';

const PERIODS = [
  { key: '12w', label: '12 weeks', title: 'Last 12 weeks', weeks: 12 },
  { key: '6m', label: '6 months', title: 'Last 6 months', weeks: 26 },
  { key: '12m', label: '12 months', title: 'Last 12 months', weeks: 52 },
] as const;

// Rating drives opacity: 3★ full, 2★ faded, 1★ fainter. Literal classes for Tailwind.
function gymClass(r: number): string {
  return r >= 3 ? 'bg-accent' : r === 2 ? 'bg-accent/60' : 'bg-accent/30';
}
function matchClass(r: number): string {
  return r >= 3 ? 'bg-amber-400' : r === 2 ? 'bg-amber-400/60' : 'bg-amber-400/30';
}

function cellClass(d: HeatDay): string {
  if (d.future) return 'bg-surface2/30';
  if (d.gym && d.match) return `${gymClass(d.gymRating)} ring-1 ring-amber-400`;
  if (d.gym) return gymClass(d.gymRating);
  if (d.match) return matchClass(d.matchRating);
  return 'bg-surface2';
}

export function Heatmap({ log, today }: { log: LogEntry[]; today: string }) {
  const [periodKey, setPeriodKey] = useState<(typeof PERIODS)[number]['key']>('12w');
  const period = PERIODS.find((p) => p.key === periodKey)!;
  const grid = buildHeatmap(log, today, period.weeks);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{period.title}</span>
        <div className="flex rounded-lg border border-line p-0.5 text-[11px]">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodKey(p.key)}
              className={`rounded-md px-2 py-0.5 ${
                p.key === periodKey ? 'bg-surface2 text-accent' : 'text-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" /> gym
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" /> match
        </span>
        <span className="ml-auto text-slate-600">brighter = higher ★</span>
      </div>

      <div className="flex justify-between gap-[2px]">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-[2px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}${day.gym ? ` · gym ${day.gymRating}★` : ''}${
                  day.match ? ` · match ${day.matchRating}★` : ''
                }`}
                className={`aspect-square w-full rounded-[2px] ${cellClass(day)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
