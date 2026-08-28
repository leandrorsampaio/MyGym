/**
 * The two chart shapes the dashboard needs, hand-rolled in SVG.
 *
 * Deliberately not a charting library: these are small, the app has no other need for
 * one, and the heatmap already set the precedent. Both scale to their container and use
 * non-scaling strokes so a stretched viewBox doesn't thicken the lines.
 */

/** A stacked weekly bar. Each segment is a [value, colour] pair. */
export function StackedBars({
  bars,
  labelEvery = 2,
  format,
}: {
  bars: { label: string; segments: { value: number; fill: string }[] }[];
  /** Label every Nth bar, so a 12-week axis doesn't turn into mush. */
  labelEvery?: number;
  format?: (total: number) => string;
}) {
  const totals = bars.map((b) => b.segments.reduce((a, s) => a + s.value, 0));
  const peak = Math.max(...totals, 1);

  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {bars.map((bar, i) => {
          const total = totals[i]!;
          return (
            <div
              key={bar.label}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${bar.label}${format ? ` · ${format(total)}` : ''}`}
            >
              {/* Stack grows upward, so the segments render top-down reversed. */}
              {[...bar.segments].reverse().map((seg, j) =>
                seg.value > 0 ? (
                  <div
                    key={j}
                    style={{ height: `${(seg.value / peak) * 100}%`, backgroundColor: seg.fill }}
                    className="w-full first:rounded-t-sm"
                  />
                ) : null,
              )}
              {total === 0 && <div className="h-[2px] w-full rounded-sm bg-surface2" />}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-slate-600">
        {bars.map((b, i) => (
          <span key={b.label} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? b.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A line over evenly-spaced points, optionally with a second (smoothed) line. */
export function LineChart({
  values,
  overlay,
  stroke = '#34d399',
  overlayStroke = '#fbbf24',
  height = 'h-24',
  ariaLabel,
}: {
  values: (number | undefined)[];
  overlay?: (number | undefined)[];
  stroke?: string;
  overlayStroke?: string;
  height?: string;
  ariaLabel: string;
}) {
  const W = 300;
  const H = 90;
  const known = values.filter((v): v is number => v != null);
  const overlayKnown = (overlay ?? []).filter((v): v is number => v != null);
  const all = [...known, ...overlayKnown];
  if (known.length < 2) return null;

  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - ((v - lo) / span) * H;

  // Gaps are real: a missing point breaks the line rather than being interpolated over.
  const path = (series: (number | undefined)[]) => {
    let d = '';
    let pen = false;
    series.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${height}`} preserveAspectRatio="none"
         role="img" aria-label={ariaLabel}>
      {overlay && (
        <path d={path(overlay)} fill="none" stroke={overlayStroke} strokeWidth="1.5"
              strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
      <path d={path(values)} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"
            strokeDasharray={overlay ? '3 3' : undefined} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Frame for one dashboard panel: title, optional aside, and a body or an honest excuse.
 *
 * The body is a function, not JSX children, on purpose: children would be built even when
 * `enough` is false, and a chart over an empty series throws reading its own last point.
 * This way a panel that has nothing to say never constructs the thing it can't draw.
 */
export function Panel({
  title,
  aside,
  enough,
  notEnough,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  /** When false, the panel says why instead of drawing something misleading. */
  enough: boolean;
  notEnough: string;
  children: () => React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</span>
        {aside && <span className="text-xs text-slate-500">{aside}</span>}
      </div>
      {enough ? children() : <p className="py-4 text-center text-sm text-slate-500">{notEnough}</p>}
    </div>
  );
}
