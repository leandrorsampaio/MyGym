import { useState } from 'react';
import type { MatchEntry, Rating, Sport } from '../log/types';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { todayISO } from '../lib/clock';

type MatchFields = Omit<MatchEntry, 'id' | 'kind' | 'updatedAt'>;

export function LogMatchSheet({
  open,
  initial,
  title = 'Log a match',
  submitLabel = 'Log match',
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: Partial<MatchFields>;
  title?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (e: MatchFields) => void;
}) {
  const [sport, setSport] = useState<Sport>(initial?.sport ?? 'football');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [goals, setGoals] = useState(initial?.goals ?? 0);
  const [rating, setRating] = useState<Rating>(initial?.rating ?? 2);

  const submit = () => {
    onSubmit({ date, sport, goals, rating });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
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
          {submitLabel}
        </button>
      </div>
    </Sheet>
  );
}
