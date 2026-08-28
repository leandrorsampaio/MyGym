import { useState } from 'react';
import type { Program } from '../program/schema';
import type { Completion, GarminMetrics, GymEntry, Rating, SessionId } from '../log/types';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { GarminField } from './GarminField';
import { todayISO } from '../lib/clock';

type GymFields = Omit<GymEntry, 'id' | 'kind' | 'updatedAt'>;

export function LogWorkoutSheet({
  open,
  program,
  session,
  defaultCType,
  defaultSlot3,
  defaultLegAppend,
  initial,
  title,
  submitLabel = 'Log workout',
  onClose,
  onSubmit,
}: {
  open: boolean;
  program: Program;
  session: SessionId;
  defaultCType?: string;
  defaultSlot3: string;
  defaultLegAppend?: boolean;
  /** Pre-fill for edit mode. */
  initial?: Partial<GymFields>;
  title?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (e: GymFields) => void;
}) {
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [completion, setCompletion] = useState<Completion>(initial?.completion ?? 'complete');
  const [rating, setRating] = useState<Rating>(initial?.rating ?? 2);
  const [cType, setCType] = useState(initial?.cType ?? defaultCType ?? program.workouts.C.alternates[0]?.key);
  // Auto-recorded from the recommendation so the rotation advances; not asked in the UI.
  const [slot3] = useState(initial?.slot3 ?? defaultSlot3);
  const [legAppend, setLegAppend] = useState(initial?.legAppend ?? !!defaultLegAppend);
  const [garminUrl, setGarminUrl] = useState(initial?.garminUrl ?? '');
  const [garmin, setGarmin] = useState<GarminMetrics | undefined>(initial?.garmin);

  const submit = () => {
    onSubmit({
      date,
      session,
      completion,
      rating,
      slot3,
      // Always send both keys so clearing the field clears them on an edit too.
      garminUrl: garminUrl.trim() || undefined,
      garmin,
      ...(session === 'C' ? { cType, legAppend } : {}),
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={title ?? `Finish Session ${session}`}>
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
                className={`rounded-lg border py-2 font-medium hover:border-slate-500 ${
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
                  className={`rounded-lg border py-2 text-sm hover:border-slate-500 ${
                    cType === a.key ? 'border-accent text-accent' : 'border-line text-slate-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {session === 'C' && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={legAppend} onChange={(e) => setLegAppend(e.target.checked)} />
            Added leg load (Squat 2×5 + RDL 2×8)
          </label>
        )}

        <Field label="How did it go?">
          <StarRating value={rating} onChange={setRating} />
        </Field>

        <GarminField
          url={garminUrl}
          garmin={garmin}
          onChange={(u, g) => {
            setGarminUrl(u);
            setGarmin(g);
          }}
        />

        <button
          onClick={submit}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-bg hover:bg-accentDim active:bg-accentDim"
        >
          {submitLabel}
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
