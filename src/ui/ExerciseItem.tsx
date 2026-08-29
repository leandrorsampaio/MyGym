import type { Item, Movement } from '../program/schema';
import { Thumb } from './Thumb';

/**
 * One exercise, as read from arm's length with the phone on a bench.
 *
 * The prescription is the largest thing on the card — bigger than the exercise name —
 * because between sets that is the only thing you are actually looking for. Rest and the
 * coaching cue are quiet; video is a small secondary control rather than a play tile
 * competing with the numbers.
 */

function PlayButton({ m, onPlay }: { m: Movement; onPlay: (url: string, title: string) => void }) {
  if (!m.video) return null;
  return (
    <button
      onClick={() => onPlay(m.video!, m.name)}
      aria-label={`Watch ${m.name}`}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-xs text-slate-400 hover:border-slate-500 hover:text-slate-100"
    >
      ▶
    </button>
  );
}

export function ExerciseItem({
  item,
  onPlay,
}: {
  item: Item;
  onPlay: (url: string, title: string) => void;
}) {
  const multi = item.movements.length > 1;
  const first = item.movements[0]!;

  // Supersets are one card, not two unrelated rows: the pairing is the instruction.
  if (multi) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        {item.label && (
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {item.label}
          </div>
        )}
        <div className="space-y-1">
          {item.movements.map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <span className="w-6 shrink-0 font-mono text-xs text-accent">
                {String.fromCharCode(65)}
                {i + 1}
              </span>
              <Thumb src={m.thumbnail ?? item.thumbnail} size={34} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-100">
                {m.name}
              </span>
              {m.reps && (
                <span className="shrink-0 text-base font-semibold tabular-nums">{m.reps}</span>
              )}
              <PlayButton m={m} onPlay={onPlay} />
            </div>
          ))}
        </div>
        {(item.reps || item.rest || item.note) && (
          <div className="mt-2.5 border-t border-line pt-2.5 text-[12.5px] text-slate-400">
            {[item.reps, item.rest && `rest ${item.rest}`, item.note].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Thumb src={first.thumbnail ?? item.thumbnail} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-semibold leading-snug tracking-tight text-slate-100">
            {item.label ?? first.name}
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            {item.reps && (
              <span className="text-2xl font-bold tabular-nums tracking-tight">{item.reps}</span>
            )}
            {item.rest && (
              <span className="shrink-0 text-[13px] tabular-nums text-slate-400">rest {item.rest}</span>
            )}
          </div>
        </div>
      </div>

      {(item.note || item.intensity || first.video) && (
        <div className="mt-2.5 flex items-center justify-between gap-3">
          {/* Only render the cue when there is one — an empty paragraph still holds a line. */}
          {(item.intensity || item.note) && (
            <p className="min-w-0 text-[12.5px] leading-relaxed text-slate-500">
              {[item.intensity, item.note].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="ml-auto">
            <PlayButton m={first} onPlay={onPlay} />
          </div>
        </div>
      )}
    </div>
  );
}
