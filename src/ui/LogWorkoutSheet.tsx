import { useState } from 'react';
import type { Program } from '../program/schema';
import type { Completion, GymEntry, Rating, SessionId } from '../log/types';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { todayISO } from '../lib/clock';

export function LogWorkoutSheet({
  open,
  program,
  session,
  defaultCType,
  defaultSlot3,
  defaultLegAppend,
  onClose,
  onSubmit,
}: {
  open: boolean;
  program: Program;
  session: SessionId;
  defaultCType?: string;
  defaultSlot3: string;
  defaultLegAppend?: boolean;
  onClose: () => void;
  onSubmit: (e: Omit<GymEntry, 'id' | 'kind' | 'updatedAt'>) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [completion, setCompletion] = useState<Completion>('complete');
  const [rating, setRating] = useState<Rating>(2);
  const [cType, setCType] = useState(defaultCType ?? program.workouts.C.alternates[0]?.key);
  const [slot3, setSlot3] = useState(defaultSlot3);
  const [legAppend, setLegAppend] = useState(!!defaultLegAppend);

  const slot3Options = program.coreFinisher.slots.find((s) => s.rotates)?.options ?? [];

  const submit = () => {
    onSubmit({
      date,
      session,
      completion,
      rating,
      slot3,
      ...(session === 'C' ? { cType, legAppend } : {}),
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Finish Session ${session}`}>
      <div className="space-y-4">
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface2 px-3 py-2"
          />
        </Field>

        <Field label="Completion">
          <div className="grid grid-cols-2 gap-2">
            {(['complete', 't1'] as Completion[]).map((c) => (
              <button
                key={c}
                onClick={() => setCompletion(c)}
                className={`rounded-lg border py-2 font-medium ${
                  completion === c ? 'border-accent text-accent' : 'border-line text-slate-300'
                }`}
              >
                {c === 'complete' ? 'Complete (T1+T2)' : 'T1 only'}
              </button>
            ))}
          </div>
        </Field>

        {session === 'C' && (
          <Field label="Conditioning type">
            <div className="grid grid-cols-2 gap-2">
              {program.workouts.C.alternates.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setCType(a.key)}
                  className={`rounded-lg border py-2 text-sm ${
                    cType === a.key ? 'border-accent text-accent' : 'border-line text-slate-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Core slot-3 done">
          <select
            value={slot3}
            onChange={(e) => setSlot3(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface2 px-3 py-2"
          >
            {slot3Options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>

        {session === 'C' && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={legAppend} onChange={(e) => setLegAppend(e.target.checked)} />
            Added leg load (Squat 2×5 + RDL 2×8)
          </label>
        )}

        <Field label="How did it go?">
          <StarRating value={rating} onChange={setRating} />
        </Field>

        <button onClick={submit} className="w-full rounded-xl bg-accent py-3 font-semibold text-bg active:bg-accentDim">
          Log workout
        </button>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      {children}
    </div>
  );
}
