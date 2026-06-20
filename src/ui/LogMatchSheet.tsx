import { useState } from 'react';
import type { MatchEntry, Rating, Sport } from '../log/types';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { todayISO } from '../lib/clock';

export function LogMatchSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: Omit<MatchEntry, 'id' | 'kind' | 'updatedAt'>) => void;
}) {
  const [sport, setSport] = useState<Sport>('football');
  const [date, setDate] = useState(todayISO());
  const [goals, setGoals] = useState(0);
  const [rating, setRating] = useState<Rating>(2);

  const submit = () => {
    onSubmit({ date, sport, goals, rating });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Log a match">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['football', 'futsal'] as Sport[]).map((s) => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`rounded-lg border py-2 font-medium capitalize ${
                sport === s ? 'border-accent text-accent' : 'border-line text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface2 px-3 py-2"
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Goals</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGoals((g) => Math.max(0, g - 1))}
              className="h-11 w-11 rounded-lg border border-line text-xl"
            >
              −
            </button>
            <span className="w-10 text-center text-2xl font-semibold">{goals}</span>
            <button
              onClick={() => setGoals((g) => g + 1)}
              className="h-11 w-11 rounded-lg border border-line text-xl"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Performance</div>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <button onClick={submit} className="w-full rounded-xl bg-accent py-3 font-semibold text-bg active:bg-accentDim">
          Log match
        </button>
      </div>
    </Sheet>
  );
}
