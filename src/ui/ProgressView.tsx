import { useMemo } from "react";
import type { LogEntry } from "../log/types";
import {
  activityPoints,
  goalTrend,
  loadRamp,
  weeklyLoad,
  TREND_MIN_POINTS,
} from "../engine/progress";
import { LineChart, Panel, StackedBars } from "./Chart";
import { GarminBackfill } from "./GarminBackfill";
import { SessionBreakdown } from "./SessionBreakdown";
import { Highlights } from "./Highlights";
import { StatTiles } from "./Stats";

const GYM_FILL = "#38bdf8";
const FOOTBALL_FILL = "#34d399";

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function Legend({ items }: { items: { label: string; fill: string }[] }) {
  return (
    <span className="flex items-center gap-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1">
          <i
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: i.fill }}
          />
          {i.label}
        </span>
      ))}
    </span>
  );
}

/**
 * The Progress dashboard.
 *
 * Every panel here depends on Garmin data, which is optional on every entry — so each one
 * decides whether it has enough to say something and otherwise says what is missing. A
 * trend drawn through three points is worse than no trend: it invites a conclusion the
 * data cannot support.
 */
export function ProgressView({
  log,
  today,
  onEntry,
}: {
  log: LogEntry[];
  today: string;
  /** Persists an entry the backfill has just filled in. */
  onEntry: (entry: LogEntry) => void;
}) {
  const weeks = useMemo(() => weeklyLoad(log, today, 12), [log, today]);
  const points = useMemo(() => activityPoints(log), [log]);
  const goals = useMemo(() => goalTrend(log), [log]);

  const ramp = loadRamp(weeks);
  const weeksWithLoad = weeks.filter((w) => w.total > 0).length;
  const unlinked = weeks.reduce((a, w) => a + (w.activities - w.linked), 0);

  const matchPoints = points.filter((p) => p.kind === "match");
  const hrPoints = matchPoints.filter((p) => p.avgHr != null);
  const sharePoints = matchPoints.filter((p) => p.highShare != null);

  const medianLoad = (() => {
    const loads = matchPoints
      .map((p) => p.exerciseLoad)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    return loads.length ? loads[Math.floor(loads.length / 2)] : undefined;
  })();

  return (
    // One flat grid rather than two packed columns: on a phone the panels then appear in
    // priority order (the charts first), and on desktop they pair up two to a row.
    <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0">
      <GarminBackfill log={log} onEntry={onEntry} />

      <Panel
        title="Weekly training load"
        aside={
          <Legend
            items={[
              { label: "gym", fill: GYM_FILL },
              { label: "football", fill: FOOTBALL_FILL },
            ]}
          />
        }
        enough={weeksWithLoad > 0}
        notEnough={
          unlinked > 0
            ? `${unlinked} activities logged, none with a Garmin link yet. Paste one when you log, or open an entry to fetch it.`
            : "No linked activities yet."
        }
      >
        {() => (
          <>
            <StackedBars
              bars={weeks.map((w) => ({
                label: shortDate(w.weekStart),
                segments: [
                  { value: w.football, fill: FOOTBALL_FILL },
                  { value: w.gym, fill: GYM_FILL },
                ],
              }))}
              labelEvery={3}
              format={(t) => `load ${Math.round(t)}`}
            />
            <div className="mt-3 border-t border-line pt-2 text-sm">
              {ramp == null ? (
                <span className="text-slate-500">
                  Two weeks of data will show the week-on-week change.
                </span>
              ) : (
                <span
                  className={ramp > 0.5 ? "text-amber-300" : "text-slate-400"}
                >
                  {ramp >= 0 ? "+" : ""}
                  {Math.round(ramp * 100)}% vs the week before
                  {ramp > 0.5 && " — a big jump; watch the legs"}
                </span>
              )}
            </div>
            {unlinked > 0 && weeksWithLoad > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {unlinked} activit{unlinked === 1 ? "y" : "ies"} in this window
                had no Garmin data, so the bars understate the real load.
              </p>
            )}
          </>
        )}
      </Panel>

      <Panel
        title="Goals per match"
        aside={goals.length ? `${goals.length} matches` : undefined}
        enough={goals.length > 0}
        notEnough="No matches logged yet."
      >
        {() => (
          <>
            <LineChart
              values={goals.map((g) => g.goals)}
              overlay={
                goals.length >= TREND_MIN_POINTS
                  ? goals.map((g) => g.rolling)
                  : undefined
              }
              stroke="#475569"
              overlayStroke="#34d399"
              ariaLabel="Goals per match over time"
            />
            <div className="mt-1 flex items-baseline justify-between text-xs text-slate-500">
              <span>{shortDate(goals[0]?.date ?? today)}</span>
              <span className="text-slate-400">
                {goals.length >= TREND_MIN_POINTS
                  ? `rolling avg ${goals[goals.length - 1]!.rolling.toFixed(1)}/match`
                  : `${TREND_MIN_POINTS - goals.length} more matches for a trend line`}
              </span>
              <span>{shortDate(goals[goals.length - 1]?.date ?? today)}</span>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Fitness · avg HR per match"
        aside={
          hrPoints.length
            ? `${Math.min(...hrPoints.map((p) => p.avgHr!))}–${Math.max(
                ...hrPoints.map((p) => p.avgHr!),
              )} bpm${medianLoad != null ? ` · median load ${medianLoad}` : ''}`
            : undefined
        }
        enough={hrPoints.length >= TREND_MIN_POINTS}
        notEnough={`${hrPoints.length} of ${TREND_MIN_POINTS} matches with heart-rate data. A falling line at a steady load means fitter — it takes months to mean anything.`}
      >
        {() => (
          <>
            <LineChart
              values={hrPoints.map((p) => p.avgHr)}
              stroke="#f87171"
              ariaLabel="Average heart rate per match over time"
            />
            {/* Dates, not min/max: sat under the ends of the line, the range read as
                the start and end values, which is the opposite of what it shows. */}
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{shortDate(hrPoints[0]!.date)}</span>
              <span className="text-slate-600">
                lower at the same load = fitter
              </span>
              <span>{shortDate(hrPoints[hrPoints.length - 1]!.date)}</span>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Intensity · time in Z4–Z5"
        aside={sharePoints.length ? `${sharePoints.length} matches` : undefined}
        enough={sharePoints.length >= TREND_MIN_POINTS}
        notEnough={`${sharePoints.length} of ${TREND_MIN_POINTS} matches with zone data.`}
      >
        {() => (
          <>
            <LineChart
              values={sharePoints.map((p) => p.highShare! * 100)}
              stroke="#fbbf24"
              ariaLabel="Share of each match spent in heart-rate zones 4 and 5"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{shortDate(sharePoints[0]?.date ?? today)}</span>
              <span className="text-slate-400">
                last{" "}
                {Math.round(
                  sharePoints[sharePoints.length - 1]!.highShare! * 100,
                )}
                % of the match
              </span>
              <span>
                {shortDate(sharePoints[sharePoints.length - 1]?.date ?? today)}
              </span>
            </div>
          </>
        )}
      </Panel>

      <SessionBreakdown log={log} />
      <Highlights log={log} />
      <StatTiles log={log} />
    </div>
  );
}
