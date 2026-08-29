import { useMemo, useState } from 'react';
import type { LogEntry } from '../log/types';
import { isGym } from '../log/types';
import {
  activityPoints,
  goalTrend,
  loadRamp,
  weeklyLoad,
  weeklyVerdict,
  TREND_MIN_POINTS,
  type VerdictTone,
} from '../engine/progress';
import { consistency, gymStats } from '../engine/stats';
import { Dots, LineChart, Panel, StackedBars } from './Chart';
import { GarminBackfill } from './GarminBackfill';
import { backfillCandidates } from '../garmin/backfill';

const GYM_FILL = '#38bdf8';
const BALL_FILL = '#fbbf24';

/** Verdict colours are semantic, not the accent: they encode a state, not a brand. */
const TONE: Record<VerdictTone, { ring: string; text: string; wash: string; word: string }> = {
  'on-track': { ring: 'border-accent/30', text: 'text-accent', wash: 'bg-accent/5', word: 'On track' },
  high: { ring: 'border-amber-400/35', text: 'text-amber-300', wash: 'bg-amber-400/5', word: 'High load' },
  light: { ring: 'border-sky-400/30', text: 'text-sky-300', wash: 'bg-sky-400/5', word: 'Lighter week' },
  unknown: { ring: 'border-line', text: 'text-slate-400', wash: 'bg-surface2/40', word: 'Not enough data' },
};

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
}

function Kpi({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="text-xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-accent">{sub}</div>}
    </div>
  );
}

function Bar({ label, value, max, fill }: { label: string; value: number; max: number; fill: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-4 font-bold">{label}</span>
      <span
        className="block h-2.5 rounded-sm"
        style={{ width: `${max ? (value / max) * 78 : 0}%`, backgroundColor: fill }}
      />
      <b className="font-semibold tabular-nums text-slate-400">{value}</b>
    </div>
  );
}

/**
 * Review — two questions, asked separately.
 *
 * Football asks *am I performing?*; gym asks *am I consistent?*. They share only weekly
 * load, which is the one measure that means something combined, so that stays above the
 * split. Everything below depends on Garmin data, which is optional everywhere, so each
 * panel says what it is missing rather than drawing a line through too few points.
 */
export function ReviewView({
  log,
  today,
  onEntry,
}: {
  log: LogEntry[];
  today: string;
  /** Persists an entry the backfill has just filled in. */
  onEntry: (entry: LogEntry) => void;
}) {
  const [pane, setPane] = useState<'football' | 'gym'>('football');

  const weeks = useMemo(() => weeklyLoad(log, today, 12), [log, today]);
  const points = useMemo(() => activityPoints(log), [log]);
  const goals = useMemo(() => goalTrend(log), [log]);
  const verdict = useMemo(() => weeklyVerdict(log, today), [log, today]);
  const c = useMemo(() => consistency(log, today), [log, today]);
  const g = useMemo(() => gymStats(log), [log]);

  const tone = TONE[verdict.tone];
  const ramp = loadRamp(weeks);
  const weeksWithLoad = weeks.filter((w) => w.total > 0).length;
  const unlinked = weeks.reduce((a, w) => a + (w.activities - w.linked), 0);
  // Only point at the catch-up button when there is actually something it could fetch.
  const fetchable = useMemo(() => backfillCandidates(log).length, [log]);

  const matches = points.filter((p) => p.kind === 'match');
  const hr = matches.filter((p) => p.avgHr != null);
  const share = matches.filter((p) => p.highShare != null);
  const matchLoad = matches.filter((p) => p.exerciseLoad != null);

  const [metric, setMetric] = useState<'hr' | 'share' | 'load'>('hr');
  const METRICS = {
    hr: { points: hr, values: hr.map((p) => p.avgHr!), stroke: '#f87171',
      note: 'Lower at a similar load is what getting fitter looks like.' },
    share: { points: share, values: share.map((p) => p.highShare! * 100), stroke: BALL_FILL,
      note: 'Share of each match spent at threshold and above.' },
    load: { points: matchLoad, values: matchLoad.map((p) => p.exerciseLoad!), stroke: '#34d399',
      note: 'Exercise load Garmin assigned to each match.' },
  } as const;
  const m = METRICS[metric];

  const played = { football: 0, futsal: 0, training: 0 };
  for (const e of log) if (!isGym(e)) played[e.sport]++;
  const playedMax = Math.max(...Object.values(played), 1);

  const totalGoals = goals.reduce((a, p) => a + p.goals, 0);
  const avgHrAll = hr.length ? Math.round(hr.reduce((a, p) => a + p.avgHr!, 0) / hr.length) : null;
  const gymLoadByWeek = weeks.map((w) => w.gym);

  return (
    <div className="space-y-5 md:mx-auto md:max-w-3xl">
      <GarminBackfill log={log} onEntry={onEntry} />

      {/* The claim, before any chart. */}
      <div className={`rounded-2xl border p-5 ${tone.ring} ${tone.wash}`}>
        <div className={`text-[11px] font-bold uppercase tracking-widest ${tone.text}`}>{tone.word}</div>
        <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-slate-100">
          {verdict.headline}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{verdict.detail}</p>
      </div>

      {/* Shared: load only means something with both halves in it. */}
      <Panel
        title="Training rhythm · everything"
        aside={
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-sm" style={{ background: GYM_FILL }} /> gym
            </span>
            <span className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-sm" style={{ background: BALL_FILL }} /> football
            </span>
          </span>
        }
        enough={weeksWithLoad > 0}
        notEnough={
          unlinked === 0
            ? 'No activities logged yet.'
            : fetchable > 0
              ? `${unlinked} activities logged and none carry Garmin data yet — fetch the ${fetchable} with a link, above.`
              : `${unlinked} activities logged, none with a Garmin link. Paste one when you log, or add it from the entry.`
        }
      >
        {() => (
          <>
            <StackedBars
              bars={weeks.map((w) => ({
                label: shortDate(w.weekStart),
                segments: [
                  { value: w.football, fill: BALL_FILL },
                  { value: w.gym, fill: GYM_FILL },
                ],
              }))}
              labelEvery={3}
              format={(t) => `load ${Math.round(t)}`}
            />
            <div className="mt-3 border-t border-line pt-2 text-sm">
              {ramp == null ? (
                <span className="text-slate-500">Two weeks of data will show the change.</span>
              ) : (
                <span className={ramp > 0.5 ? 'text-amber-300' : 'text-slate-400'}>
                  {ramp >= 0 ? '+' : ''}
                  {Math.round(ramp * 100)}% vs the week before
                  {ramp > 0.5 && ' — a big jump; watch the legs'}
                </span>
              )}
            </div>
            {unlinked > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {unlinked} activit{unlinked === 1 ? 'y' : 'ies'} here had no Garmin data, so the bars
                understate the real load.
              </p>
            )}
          </>
        )}
      </Panel>

      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
        {(['football', 'gym'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setPane(k)}
            aria-pressed={pane === k}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
              pane === k ? 'bg-surface2 text-accent' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {pane === 'football' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Kpi value={String(goals.length)} label="Matches" />
            <Kpi
              value={String(totalGoals)}
              label="Goals"
              sub={goals.length ? `${(totalGoals / goals.length).toFixed(1)} / match` : undefined}
            />
            <Kpi value={avgHrAll ? String(avgHrAll) : '—'} label="Avg bpm" />
          </div>

          <Panel
            title="Goals per match"
            aside={goals.length ? `${goals.length} matches` : undefined}
            enough={goals.length > 0}
            notEnough="No matches logged yet."
          >
            {() => (
              <>
                <Dots
                  values={goals.map((p) => p.goals)}
                  fill={BALL_FILL}
                  label={(v, i) => `${goals[i]!.date} · ${v} goal${v === 1 ? '' : 's'}`}
                />
                <div className="mt-2 flex items-baseline justify-between text-xs text-slate-500">
                  <span>{shortDate(goals[0]!.date)}</span>
                  <span className="text-slate-400">
                    {goals.length >= TREND_MIN_POINTS
                      ? `rolling avg ${goals[goals.length - 1]!.rolling.toFixed(1)}/match`
                      : `${TREND_MIN_POINTS - goals.length} more for a rolling average`}
                  </span>
                  <span>{shortDate(goals[goals.length - 1]!.date)}</span>
                </div>
              </>
            )}
          </Panel>

          <Panel
            title="Condition"
            aside={
              <span className="flex gap-1 rounded-lg border border-line p-0.5">
                {([['hr', 'Avg HR'], ['share', 'Z4–5'], ['load', 'Load']] as const).map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setMetric(k)}
                    aria-pressed={metric === k}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      metric === k ? 'bg-surface2 text-accent' : 'text-slate-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </span>
            }
            enough={m.points.length >= TREND_MIN_POINTS}
            notEnough={`${m.points.length} of ${TREND_MIN_POINTS} matches with this data. A trend needs a season, not a fortnight.`}
          >
            {() => (
              <>
                <LineChart values={m.values} stroke={m.stroke} ariaLabel="Football condition over time" />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>{shortDate(m.points[0]!.date)}</span>
                  <span className="text-slate-600">{m.note}</span>
                  <span>{shortDate(m.points[m.points.length - 1]!.date)}</span>
                </div>
              </>
            )}
          </Panel>

          <Panel title="What you played" enough={goals.length + played.training > 0} notEnough="Nothing logged yet.">
            {() => (
              <>
                <div className="flex flex-col gap-2.5">
                  <Bar label="⚽" value={played.football} max={playedMax} fill={BALL_FILL} />
                  <Bar label="◇" value={played.futsal} max={playedMax} fill="#a78bfa" />
                  <Bar label="▲" value={played.training} max={playedMax} fill="#34d399" />
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Football · futsal · training. Training carries no scoreline, so it sits outside
                  goals per match.
                </p>
              </>
            )}
          </Panel>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <Kpi value={String(g.total)} label="Sessions" />
            <Kpi value={c.avgPerWeek.toFixed(1)} label="Per week" />
            <Kpi
              value={g.total ? `${Math.round((g.complete / g.total) * 100)}%` : '—'}
              label="Full"
              sub={g.t1Only ? `${g.t1Only} T1 only` : undefined}
            />
          </div>

          <Panel title="Session mix" aside="A every cycle" enough={g.total > 0} notEnough="No gym sessions yet.">
            {() => (
              <div className="flex flex-col gap-2.5">
                <Bar label="A" value={g.bySession.A} max={g.total} fill="#34d399" />
                <Bar label="B" value={g.bySession.B} max={g.total} fill={GYM_FILL} />
                <Bar label="C" value={g.bySession.C} max={g.total} fill="#a78bfa" />
              </div>
            )}
          </Panel>

          <Panel
            title="Gym load"
            aside="12 weeks"
            enough={gymLoadByWeek.some((v) => v > 0)}
            notEnough="No gym session has Garmin data yet."
          >
            {() => (
              <>
                <Dots
                  values={gymLoadByWeek}
                  fill={GYM_FILL}
                  label={(v, i) => `${shortDate(weeks[i]!.weekStart)} · load ${v}`}
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{shortDate(weeks[0]!.weekStart)}</span>
                  <span>{shortDate(weeks[weeks.length - 1]!.weekStart)}</span>
                </div>
              </>
            )}
          </Panel>

          <Panel title="Finishing the work" aside={`last ${g.total}`} enough={g.total > 0} notEnough="No gym sessions yet.">
            {() => (
              <>
                <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-surface2">
                  <div style={{ width: `${(g.complete / g.total) * 100}%` }} className="bg-accent" />
                </div>
                <div className="flex items-center gap-3 py-0.5 text-sm">
                  <i className="h-2.5 w-2.5 rounded-sm bg-accent" />
                  <span className="w-7 font-semibold tabular-nums">{g.complete}</span>
                  <span className="text-slate-500">full session</span>
                </div>
                <div className="flex items-center gap-3 py-0.5 text-sm">
                  <i className="h-2.5 w-2.5 rounded-sm bg-line" />
                  <span className="w-7 font-semibold tabular-nums">{g.t1Only}</span>
                  <span className="text-slate-500">essential only</span>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
