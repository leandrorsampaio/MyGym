import { useMemo } from 'react';
import type { Program } from '../program/schema';
import type { SessionId } from '../log/types';
import { ExerciseItem } from './ExerciseItem';
import { Thumb } from './Thumb';

/**
 * The session, running.
 *
 * The decision this screen exists to serve is not "which exercise is next" — the list
 * answers that by itself. It is **do I have capacity for the optional tier today?** So the
 * T2 work is held back behind an explicit choice rather than sitting there as a checklist
 * you failed to finish, and the action bar changes to match the answer.
 *
 * Nothing is ticked off. Per-exercise completion would cost taps mid-session and produce
 * data nobody reads; what actually gets logged is that one tier decision, which is exactly
 * what `completion: 'complete' | 't1'` has always meant.
 */

export type Optional = 'undecided' | 'added' | 'skipped';

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</h3>
        {hint && <span className="text-[11px] text-slate-600">{hint}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/**
 * A map of the session, not a progress bar: it shows what today contains and whether the
 * optional tier is in. We do not track how far through you are, and pretending to would be
 * a claim the app cannot back up.
 */
function SessionMap({ optional }: { optional: Optional }) {
  const parts = [
    { label: 'Prep', on: true },
    { label: 'Main', on: true },
    { label: 'Optional', on: optional === 'added' },
    { label: 'Finish', on: true },
  ];
  return (
    <div className="mt-3 flex items-center gap-2">
      {parts.map((p) => (
        <div key={p.label} className="flex flex-1 flex-col gap-1.5">
          <i className={`block h-[3px] rounded-full ${p.on ? 'bg-accent' : 'bg-line'}`} />
          <span
            className={`text-[9px] font-bold uppercase tracking-widest ${
              p.on ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function WorkoutView({
  program,
  session,
  cType,
  slot3Next,
  legAppend,
  optional,
  onOptional,
  onPlay,
  onBack,
  onFinish,
}: {
  program: Program;
  session: SessionId;
  cType?: string;
  slot3Next: string;
  legAppend?: boolean;
  optional: Optional;
  onOptional: (o: Optional) => void;
  onPlay: (url: string, title: string) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const workout = program.workouts[session];
  const showT2 = optional === 'added';
  const prep = program.athleticPrep.items;

  // Everything the optional tier would add, wherever it sits in the session.
  const t2Count = useMemo(() => {
    let n = prep.filter((i) => i.tier === 'T2').length;
    if (workout.type === 'strength') n += workout.items.filter((i) => i.tier === 'T2').length;
    else if (workout.cooldown?.tier === 'T2') n += 1;
    return n;
  }, [prep, workout]);

  const keep = (tier: 'T1' | 'T2') => tier === 'T1' || showT2;

  return (
    <div className="pb-32 md:mx-auto md:max-w-2xl">
      <div className="flex items-center justify-between pt-1">
        <button onClick={onBack} className="-ml-1 py-1 pr-2 text-sm text-slate-400 hover:text-slate-100">
          ← Session {session}
        </button>
        <span className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
          {showT2 ? 'Full session' : 'Essential'}
        </span>
      </div>

      <SessionMap optional={optional} />

      <h1 className="mt-4 text-xl font-bold tracking-tight">{workout.name}</h1>
      {workout.note && <p className="mt-1 text-sm text-slate-400">{workout.note}</p>}

      <Block title={program.athleticPrep.title} hint="always">
        {prep
          .filter((i) => keep(i.tier))
          .map((i, idx) => (
            <ExerciseItem key={idx} item={i} onPlay={onPlay} />
          ))}
      </Block>

      <Block title="Main" hint="essential · never cut">
        {workout.type === 'strength' ? (
          workout.items
            .filter((i) => keep(i.tier))
            .map((i, idx) => <ExerciseItem key={idx} item={i} onPlay={onPlay} />)
        ) : (
          <>
            {workout.warmup && keep(workout.warmup.tier) && (
              <ExerciseItem item={workout.warmup} onPlay={onPlay} />
            )}
            {workout.alternates
              // The variant you are not doing today is not an instruction.
              .filter((alt) => alt.key === (cType ?? workout.alternates[0]?.key))
              .map((alt) => (
                <div key={alt.key} className="rounded-2xl border border-accent/40 bg-surface p-4">
                  <div className="text-[17px] font-semibold tracking-tight text-slate-100">
                    {alt.label}
                  </div>
                  <div className="mt-1.5 text-base text-slate-200">{alt.main}</div>
                  {alt.note && <div className="mt-2 text-[12.5px] text-slate-500">{alt.note}</div>}
                </div>
              ))}
            {legAppend && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                Leg append (two futsal weeks): <b>Squat 2×5 + RDL 2×8</b>
              </div>
            )}
            {workout.cooldown && keep(workout.cooldown.tier) && (
              <ExerciseItem item={workout.cooldown} onPlay={onPlay} />
            )}
          </>
        )}
      </Block>

      {/* The one decision worth asking about. */}
      {optional === 'undecided' && t2Count > 0 && (
        <Block title="Optional" hint="drop it if you are short on time">
          <div className="rounded-2xl border border-dashed border-line bg-surface2/30 p-5 text-center">
            <p className="text-[15px] font-semibold text-slate-100">Optional work</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {t2Count} exercise{t2Count === 1 ? '' : 's'} · roughly {t2Count * 4} minutes
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onOptional('added')}
                className="flex-1 rounded-xl bg-accent py-2.5 font-semibold text-bg hover:bg-accentDim"
              >
                Add it
              </button>
              <button
                onClick={() => onOptional('skipped')}
                className="flex-1 rounded-xl border border-line py-2.5 font-semibold text-slate-300 hover:border-slate-500"
              >
                Skip
              </button>
            </div>
          </div>
        </Block>
      )}

      {optional === 'skipped' && (
        <p className="mt-6 text-center text-[12.5px] text-slate-600">
          Optional work skipped ·{' '}
          <button
            onClick={() => onOptional('added')}
            className="text-slate-400 underline underline-offset-2 hover:text-slate-200"
          >
            add it after all
          </button>
        </p>
      )}

      <Block title={program.coreFinisher.title} hint="never cut">
        {program.coreFinisher.slots.map((slot) => {
          // A rotating slot has exactly one option for today; the rest are not instructions.
          const today = slot.rotates
            ? (slot.options.find((o) => o.key === slot3Next) ?? slot.options[0]!)
            : null;
          const shown = today ? [today] : slot.options;
          return (
            <div key={slot.slot} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[17px] font-semibold tracking-tight text-slate-100">
                  {slot.label}
                </span>
                {slot.reps && <span className="text-lg font-bold tabular-nums">{slot.reps}</span>}
              </div>
              <div className="mt-2 space-y-1">
                {shown.map((o, i) => (
                  <div key={i} className="flex items-center gap-3 py-0.5">
                    <Thumb src={o.thumbnail} size={34} />
                    <span className="min-w-0 flex-1 truncate text-[15px] text-slate-200">{o.name}</span>
                    {o.video && (
                      <button
                        onClick={() => onPlay(o.video!, o.name)}
                        aria-label={`Watch ${o.name}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-xs text-slate-400 hover:border-slate-500 hover:text-slate-100"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {slot.note && <div className="mt-2 text-[12.5px] text-slate-500">{slot.note}</div>}
            </div>
          );
        })}
      </Block>

      {/* Reachable one-handed, and it says what finishing right now would mean. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2 px-1">
          {optional === 'undecided' && t2Count > 0 && (
            <button
              onClick={() => onOptional('added')}
              className="flex-1 rounded-xl border border-line py-3 font-semibold text-slate-200 hover:border-slate-500 hover:bg-surface2"
            >
              Add optional
            </button>
          )}
          <button
            onClick={onFinish}
            className="flex-1 rounded-xl bg-accent py-3 font-semibold text-bg hover:bg-accentDim active:bg-accentDim"
          >
            {showT2 || optional === 'skipped' ? 'Finish session' : 'Finish essential'}
          </button>
        </div>
      </div>
    </div>
  );
}
