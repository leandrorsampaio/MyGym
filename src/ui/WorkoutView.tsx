import { useState } from 'react';
import type { Program } from '../program/schema';
import type { SessionId } from '../log/types';
import { ExerciseItem } from './ExerciseItem';

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 mt-5 flex items-baseline justify-between">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">{children}</h3>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

export function WorkoutView({
  program,
  session,
  cType,
  slot3Next,
  legAppend,
  onPlay,
  onBack,
  onFinish,
}: {
  program: Program;
  session: SessionId;
  cType?: string;
  slot3Next: string;
  legAppend?: boolean;
  onPlay: (url: string, title: string) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [t1Only, setT1Only] = useState(false);
  const workout = program.workouts[session];
  const keepTier = (tier: 'T1' | 'T2') => !t1Only || tier === 'T1';

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-slate-400">
          ← Home
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={t1Only} onChange={(e) => setT1Only(e.target.checked)} />
          T1 only
        </label>
      </div>

      <h1 className="mt-2 text-2xl font-bold">{workout.name}</h1>
      {workout.note && <p className="mt-1 text-sm text-slate-400">{workout.note}</p>}

      {/* Athletic Prep */}
      <SectionTitle hint={program.athleticPrep.note ? undefined : undefined}>
        {program.athleticPrep.title}
      </SectionTitle>
      <div className="space-y-2">
        {program.athleticPrep.items.filter((i) => keepTier(i.tier)).map((i, idx) => (
          <ExerciseItem key={idx} item={i} onPlay={onPlay} />
        ))}
      </div>

      {/* Main work */}
      <SectionTitle>Main work</SectionTitle>
      {workout.type === 'strength' ? (
        <div className="space-y-2">
          {workout.items.filter((i) => keepTier(i.tier)).map((i, idx) => (
            <ExerciseItem key={idx} item={i} onPlay={onPlay} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {workout.warmup && keepTier(workout.warmup.tier) && (
            <ExerciseItem item={workout.warmup} onPlay={onPlay} />
          )}
          {workout.alternates.map((alt) => {
            const isToday = alt.key === (cType ?? workout.alternates[0]?.key);
            return (
              <div
                key={alt.key}
                className={`rounded-xl border p-3 ${
                  isToday ? 'border-accent bg-surface' : 'border-line bg-surface/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{alt.label}</span>
                  {isToday && <span className="text-xs font-semibold text-accent">TODAY</span>}
                </div>
                <div className="mt-1 text-sm text-slate-300">{alt.main}</div>
                {alt.note && <div className="mt-1 text-xs text-slate-500">{alt.note}</div>}
              </div>
            );
          })}
          {legAppend && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              Leg append (two futsal weeks): <b>Squat 2×5 + RDL 2×8</b>
            </div>
          )}
          {workout.cooldown && keepTier(workout.cooldown.tier) && (
            <ExerciseItem item={workout.cooldown} onPlay={onPlay} />
          )}
        </div>
      )}

      {/* Core Finisher */}
      <SectionTitle hint="T1 · never cut">{program.coreFinisher.title}</SectionTitle>
      <div className="space-y-2">
        {program.coreFinisher.slots.map((slot) => {
          const current = slot.rotates ? slot.options.find((o) => o.key === slot3Next) : null;
          return (
            <div key={slot.slot} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">
                  {slot.slot}. {slot.label}
                </span>
                {slot.reps && <span className="text-sm text-slate-300">{slot.reps}</span>}
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {slot.rotates ? (
                  <>
                    <span className="font-medium text-accent">{current?.name ?? slot3Next}</span>
                    <span className="text-slate-500">
                      {' '}
                      (today) · {slot.options.filter((o) => o.key !== slot3Next).map((o) => o.name).join(' / ')}
                    </span>
                  </>
                ) : (
                  slot.options.map((o) => o.name).join(' or ')
                )}
              </div>
              {slot.note && <div className="mt-1 text-xs text-slate-500">{slot.note}</div>}
            </div>
          );
        })}
      </div>

      {/* Sticky finish button */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-bg/90 p-3 backdrop-blur">
        <button
          onClick={onFinish}
          className="mx-auto block w-full max-w-md rounded-xl bg-accent py-3 font-semibold text-bg active:bg-accentDim"
        >
          I finished the training
        </button>
      </div>
    </div>
  );
}
