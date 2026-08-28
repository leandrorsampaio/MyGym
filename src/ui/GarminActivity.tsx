import type { GarminHrZone, GarminMetrics, GarminSample } from '../log/types';
import { formatDuration } from '../garmin/parse';

/**
 * Everything Garmin recorded for one activity, at a glance.
 *
 * Every field is optional — an entry logged before we could render the page has only a
 * name and a duration — so each block renders only when its data is actually there.
 * Charts are hand-rolled SVG to keep the bundle free of a charting library.
 */

/** Zone 1 (easy) → 5 (max). Cool to hot, and distinct from the gym accent. */
const ZONE_FILL = ['#64748b', '#38bdf8', '#34d399', '#fbbf24', '#f87171'];
const ZONE_NAME = ['Warm up', 'Easy', 'Aerobic', 'Threshold', 'Max'];

/** Seconds → 'h:mm:ss' / 'm:ss'. Zone times want the exact figure, not a rounded one. */
function clock(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface2/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold leading-tight text-slate-100">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</div>
      {children}
    </div>
  );
}

/** Time in each HR zone: one proportional bar, then the per-zone breakdown. */
function HrZones({ zones }: { zones: GarminHrZone[] }) {
  const total = zones.reduce((a, z) => a + z.seconds, 0);
  if (total <= 0) return null;

  return (
    <Block title="Heart rate zones">
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-surface2">
        {zones.map((z) => (
          <div
            key={z.zone}
            style={{ width: `${(z.seconds / total) * 100}%`, backgroundColor: ZONE_FILL[z.zone - 1] }}
            title={`Zone ${z.zone} · ${clock(z.seconds)}`}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {[...zones].reverse().map((z) => (
          <div key={z.zone} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: ZONE_FILL[z.zone - 1] }}
            />
            <span className="w-6 shrink-0 font-medium text-slate-300">Z{z.zone}</span>
            <span className="w-20 shrink-0 text-xs text-slate-500">{ZONE_NAME[z.zone - 1]}</span>
            {z.lowBpm != null && <span className="shrink-0 text-xs text-slate-600">{z.lowBpm}+</span>}
            <span className="ml-auto shrink-0 tabular-nums text-slate-200">{clock(z.seconds)}</span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">
              {Math.round((z.seconds / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Block>
  );
}

/** Heart rate over the activity, as a filled line. Body battery rides along behind it. */
function HrCurve({ series, avgHr }: { series: GarminSample[]; avgHr?: number }) {
  const points = series.filter((s): s is GarminSample & { hr: number } => typeof s.hr === 'number');
  if (points.length < 2) return null;

  const W = 300;
  const H = 90;
  const hrs = points.map((p) => p.hr);
  const lo = Math.min(...hrs);
  const hi = Math.max(...hrs);
  const span = hi - lo || 1;
  const maxT = points[points.length - 1]!.t || 1;

  const x = (t: number) => (t / maxT) * W;
  const y = (hr: number) => H - ((hr - lo) / span) * H;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.hr).toFixed(1)}`).join('');
  const area = `${line}L${W},${H}L0,${H}Z`;

  return (
    <Block title="Heart rate">
      <div className="rounded-xl border border-line bg-surface2/40 p-3">
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none" role="img"
               aria-label={`Heart rate from ${lo} to ${hi} bpm over ${clock(maxT)}`}>
            <defs>
              <linearGradient id="hrfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {avgHr != null && avgHr > lo && avgHr < hi && (
              <line x1="0" y1={y(avgHr)} x2={W} y2={y(avgHr)} stroke="#475569" strokeWidth="1"
                    strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            )}
            <path d={area} fill="url(#hrfill)" />
            <path d={line} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="pointer-events-none absolute right-0 top-0 text-[10px] tabular-nums text-slate-500">
            {hi}
          </span>
          <span className="pointer-events-none absolute bottom-0 right-0 text-[10px] tabular-nums text-slate-500">
            {lo}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-600">
          <span>0:00</span>
          {avgHr != null && <span className="text-slate-500">avg {avgHr} bpm</span>}
          <span>{clock(maxT)}</span>
        </div>
      </div>
    </Block>
  );
}

/** Training effect runs 0–5. Show it as a bar so the number has a scale to sit against. */
function TrainingEffect({ label, value, message }: { label: string; value: number; message?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold tabular-nums text-slate-100">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(value / 5, 1) * 100}%` }} />
      </div>
      {message && <div className="mt-1 text-[11px] text-slate-500">{message}</div>}
    </div>
  );
}

/** 'LACTATE_THRESHOLD' → 'Lactate threshold'. */
function prettyLabel(key: string): string {
  const s = key.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function GarminActivity({ garmin }: { garmin: GarminMetrics }) {
  const g = garmin;
  const stats: { label: string; value: string; sub?: string }[] = [];

  if (g.durationSec != null) stats.push({ label: 'Duration', value: formatDuration(g.durationSec) });
  if (g.calories != null) {
    stats.push({
      label: 'Calories',
      value: String(g.calories),
      sub: g.restingCalories != null ? `${g.calories - g.restingCalories} active` : undefined,
    });
  }
  if (g.avgHr != null) {
    stats.push({ label: 'Avg HR', value: `${g.avgHr}`, sub: g.maxHr != null ? `max ${g.maxHr}` : undefined });
  }
  if (g.exerciseLoad != null) stats.push({ label: 'Load', value: String(g.exerciseLoad) });
  if (g.moderateIntensityMinutes != null || g.vigorousIntensityMinutes != null) {
    stats.push({
      label: 'Intensity min',
      value: String((g.moderateIntensityMinutes ?? 0) + (g.vigorousIntensityMinutes ?? 0) * 2),
      sub: `${g.moderateIntensityMinutes ?? 0} mod · ${g.vigorousIntensityMinutes ?? 0} vig`,
    });
  }
  if (g.bodyBatteryDelta != null) {
    stats.push({ label: 'Body battery', value: `${g.bodyBatteryDelta > 0 ? '+' : ''}${g.bodyBatteryDelta}` });
  }
  if (g.sweatLossMl != null) stats.push({ label: 'Sweat loss', value: `${g.sweatLossMl} ml` });
  if (g.steps != null && g.steps > 0) stats.push({ label: 'Steps', value: g.steps.toLocaleString('en-GB') });
  if (g.distanceM != null && g.distanceM > 0) {
    stats.push({ label: 'Distance', value: `${(g.distanceM / 1000).toFixed(2)} km` });
  }

  const hasTe = g.aerobicTrainingEffect != null || g.anaerobicTrainingEffect != null;

  return (
    <div className="space-y-4">
      {stats.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{stats.map((s) => <Stat key={s.label} {...s} />)}</div>}

      {g.series && g.series.length > 1 && <HrCurve series={g.series} avgHr={g.avgHr} />}
      {g.hrZones && g.hrZones.length > 0 && <HrZones zones={g.hrZones} />}

      {hasTe && (
        <Block title="Training effect">
          <div className="space-y-3 rounded-xl border border-line bg-surface2/40 p-3">
            {g.aerobicTrainingEffect != null && (
              <TrainingEffect label="Aerobic" value={g.aerobicTrainingEffect} message={g.aerobicTrainingEffectMessage} />
            )}
            {g.anaerobicTrainingEffect != null && (
              <TrainingEffect label="Anaerobic" value={g.anaerobicTrainingEffect} message={g.anaerobicTrainingEffectMessage} />
            )}
            {g.trainingEffectLabel && (
              <div className="border-t border-line pt-2 text-sm text-slate-300">
                {prettyLabel(g.trainingEffectLabel)}
              </div>
            )}
          </div>
        </Block>
      )}
    </div>
  );
}
