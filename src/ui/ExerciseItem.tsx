import type { Item, Movement } from '../program/schema';
import { Thumb } from './Thumb';

function TierBadge({ tier }: { tier: 'T1' | 'T2' }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
        tier === 'T1' ? 'bg-accent/20 text-accent' : 'bg-slate-600/30 text-slate-400'
      }`}
    >
      {tier}
    </span>
  );
}

function PlayButton({ m, onPlay }: { m: Movement; onPlay: (url: string, title: string) => void }) {
  if (!m.video) return <span className="text-xs text-slate-600">no video</span>;
  return (
    <button
      onClick={() => onPlay(m.video!, m.name)}
      className="rounded-lg bg-surface2 px-3 py-1 text-xs font-medium text-accent"
    >
      ▶ Play
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
  const heading = item.label ?? first.name;

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex gap-3">
        {/* Single-movement items show one thumbnail for the row. */}
        {!multi && <Thumb src={first.thumbnail ?? item.thumbnail} size={56} />}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <TierBadge tier={item.tier} />
              <span className="font-medium text-slate-100">{heading}</span>
            </div>
            <div className="text-right text-sm text-slate-300">
              {item.reps && <div>{item.reps}</div>}
              {item.rest && <div className="text-xs text-slate-500">rest {item.rest}</div>}
            </div>
          </div>

          {item.intensity && <div className="mt-1 text-xs text-amber-300/80">{item.intensity}</div>}

          {!multi && (
            <div className="mt-2 flex justify-end">
              <PlayButton m={first} onPlay={onPlay} />
            </div>
          )}
        </div>
      </div>

      {/* Supersets / multi-movement: a thumbnail per movement. */}
      {multi && (
        <div className="mt-2 space-y-1">
          {item.movements.map((m, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-surface2/50 px-2 py-1.5">
              <Thumb src={m.thumbnail ?? item.thumbnail} size={40} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                {m.name}
                {m.reps && <span className="text-slate-500"> · {m.reps}</span>}
              </span>
              <PlayButton m={m} onPlay={onPlay} />
            </div>
          ))}
        </div>
      )}

      {item.note && <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.note}</p>}
    </div>
  );
}
