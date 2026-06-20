import type { LogEntry } from '../log/types';
import { gymStats, footballStats, consistency } from '../engine/stats';
import { Stars } from './StarRating';

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-center">
      <div className="text-lg font-semibold text-slate-100">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function ConsistencyChips({ log, today }: { log: LogEntry[]; today: string }) {
  const c = consistency(log, today);
  return (
    <div className="flex gap-2">
      <Chip label="This week" value={String(c.thisWeek)} />
      <Chip label="Streak" value={`${c.streakWeeks}w`} />
      <Chip label="Avg / week" value={c.avgPerWeek.toFixed(1)} />
    </div>
  );
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</div>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{k}</span>
      <span className="text-slate-100">{v}</span>
    </div>
  );
}

export function StatTiles({ log }: { log: LogEntry[] }) {
  const g = gymStats(log);
  const f = footballStats(log);
  return (
    <div className="flex gap-3">
      <Tile title="Gym">
        <Row k="Sessions" v={g.total} />
        <Row k="A / B / C" v={`${g.bySession.A} / ${g.bySession.B} / ${g.bySession.C}`} />
        <Row k="Full / T1" v={`${g.complete} / ${g.t1Only}`} />
        <Row k="Avg" v={g.total ? <Stars value={g.avgRating} /> : '—'} />
      </Tile>
      <Tile title="Football">
        <Row k="Matches" v={f.matches} />
        <Row k="Foot / Futsal" v={`${f.bySport.football} / ${f.bySport.futsal}`} />
        <Row k="Goals" v={`${f.totalGoals} (${f.goalsPerMatch.toFixed(1)}/m)`} />
        <Row k="Avg" v={f.matches ? <Stars value={f.avgRating} /> : '—'} />
      </Tile>
    </div>
  );
}
