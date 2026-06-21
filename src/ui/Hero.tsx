import { useState } from 'react';
import type { Program } from '../program/schema';
import type { SessionId } from '../log/types';
import type { Recommendation } from '../engine/recommend';
import { ConfirmDialog } from './ConfirmDialog';

const SESSION_LABELS: Record<SessionId, string> = { A: 'A', B: 'B', C: 'C' };

function prettySlot3(program: Program, key: string): string {
  const slot = program.coreFinisher.slots.find((s) => s.rotates);
  return slot?.options.find((o) => o.key === key)?.name ?? key;
}

export function Hero({
  program,
  rec,
  onStart,
}: {
  program: Program;
  rec: Recommendation;
  onStart: (s: SessionId) => void;
}) {
  const [confirmSession, setConfirmSession] = useState<SessionId | null>(null);
  const next = program.workouts[rec.nextSession];
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-accent">Next session</div>

      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-5xl font-bold leading-none">{SESSION_LABELS[rec.nextSession]}</span>
        <span className="text-base text-slate-300">{next.name.replace(/^Session [ABC] — /, '')}</span>
      </div>

      <p className="mt-2 text-sm text-slate-400">{rec.reason}</p>

      {rec.warnings.map((w, i) => (
        <p key={i} className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          ⚠️ {w}
        </p>
      ))}

      <button
        onClick={() => onStart(rec.nextSession)}
        className="mt-4 w-full rounded-xl bg-accent py-3 text-center font-semibold text-bg active:bg-accentDim"
      >
        Start Session {SESSION_LABELS[rec.nextSession]}
      </button>

      <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm text-slate-400">
        {rec.nextSession === 'C' && rec.cTypeNext && (
          <div className="flex justify-between">
            <span>Conditioning type</span>
            <span className="text-slate-200">
              {program.workouts.C.alternates.find((a) => a.key === rec.cTypeNext)?.label ?? rec.cTypeNext}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Core slot-3</span>
          <span className="text-slate-200">{prettySlot3(program, rec.slot3Next)}</span>
        </div>
        {rec.legAppend && (
          <div className="flex justify-between text-amber-300">
            <span>Leg append</span>
            <span>Squat 2×5 + RDL 2×8</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs text-slate-500">Or pick manually</div>
        <div className="grid grid-cols-3 gap-2">
          {(['A', 'B', 'C'] as SessionId[]).map((s) => (
            <button
              key={s}
              onClick={() => setConfirmSession(s)}
              className={`rounded-xl border py-2 font-medium ${
                s === rec.nextSession ? 'border-accent text-accent' : 'border-line text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmSession !== null}
        title={confirmSession ? `Start Session ${confirmSession}?` : ''}
        message={
          confirmSession
            ? `${program.workouts[confirmSession].name.replace(/^Session [ABC] — /, '')}${
                confirmSession !== rec.nextSession ? ' — this overrides the recommended session.' : ''
              }`
            : undefined
        }
        confirmLabel="Start"
        onConfirm={() => {
          if (confirmSession) onStart(confirmSession);
          setConfirmSession(null);
        }}
        onCancel={() => setConfirmSession(null)}
      />
    </section>
  );
}
