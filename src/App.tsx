import { useEffect, useMemo, useState } from 'react';
import { useStore, useHydrated, usePendingCount } from './store/useStore';
import { recommend } from './engine/recommend';
import { nextCType, nextSlot3 } from './engine/rotation';
import { todayISO } from './lib/clock';
import { requestPersistentStorage } from './pwa/persist';
import { initSync, syncNow } from './sync/sync';
import type { SessionId } from './log/types';
import { Hero } from './ui/Hero';
import { ConsistencyChips, StatTiles } from './ui/Stats';
import { WorkoutView } from './ui/WorkoutView';
import { VideoModal } from './ui/VideoModal';
import { LogWorkoutSheet } from './ui/LogWorkoutSheet';
import { LogMatchSheet } from './ui/LogMatchSheet';
import { ProgramSheet } from './ui/JsonDropZone';
import { InstallHint } from './ui/InstallHint';

type View = 'home' | 'workout';

export default function App() {
  const hydrated = useHydrated();
  const program = useStore((s) => s.program);
  const log = useStore((s) => s.log);
  const addGym = useStore((s) => s.addGym);
  const addMatch = useStore((s) => s.addMatch);
  const pending = usePendingCount();

  useEffect(() => {
    requestPersistentStorage();
  }, []);

  // Start cloud sync once local state has hydrated.
  useEffect(() => {
    if (hydrated) initSync();
  }, [hydrated]);

  const today = todayISO();
  const rec = useMemo(() => recommend(program, log, today), [program, log, today]);
  const slot3Next = useMemo(() => nextSlot3(program, log), [program, log]);
  const cType = useMemo(() => nextCType(program, log), [program, log]);

  const [view, setView] = useState<View>('home');
  const [activeSession, setActiveSession] = useState<SessionId>(rec.nextSession);
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);

  const start = (s: SessionId) => {
    setActiveSession(s);
    setView('workout');
    window.scrollTo(0, 0);
  };

  const legAppend = activeSession === rec.nextSession ? rec.legAppend : undefined;

  if (!hydrated) {
    return (
      <div className="grid min-h-full place-items-center text-slate-500">
        <div className="text-xl font-bold tracking-tight">
          My<span className="text-accent">Gym</span>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top mx-auto min-h-full max-w-md px-4 pb-10">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold tracking-tight">
          My<span className="text-accent">Gym</span>
        </h1>
        <div className="flex items-center gap-3">
          {pending > 0 && (
            <button
              onClick={() => void syncNow()}
              className="rounded-full bg-surface2 px-2 py-1 text-xs text-slate-400"
              title="Tap to sync now"
            >
              ☁ {pending} unsynced
            </button>
          )}
          <button onClick={() => setProgramOpen(true)} aria-label="Program settings" className="text-xl text-slate-400">
            ⚙
          </button>
        </div>
      </header>

      {view === 'home' ? (
        <div className="space-y-4">
          <InstallHint />
          <Hero program={program} rec={rec} onStart={start} />
          <ConsistencyChips log={log} today={today} />
          <StatTiles log={log} />
          <button
            onClick={() => setMatchOpen(true)}
            className="w-full rounded-xl border border-line bg-surface py-3 font-medium text-slate-200"
          >
            ⚽ I played — log a match
          </button>
        </div>
      ) : (
        <WorkoutView
          program={program}
          session={activeSession}
          cType={cType}
          slot3Next={slot3Next}
          legAppend={legAppend}
          onPlay={(url, title) => setVideo({ url, title })}
          onBack={() => setView('home')}
          onFinish={() => setFinishOpen(true)}
        />
      )}

      {video && <VideoModal url={video.url} title={video.title} onClose={() => setVideo(null)} />}

      <LogWorkoutSheet
        open={finishOpen}
        program={program}
        session={activeSession}
        defaultCType={cType}
        defaultSlot3={slot3Next}
        defaultLegAppend={legAppend}
        onClose={() => setFinishOpen(false)}
        onSubmit={(e) => {
          addGym(e);
          void syncNow();
          setView('home');
          window.scrollTo(0, 0);
        }}
      />

      <LogMatchSheet
        open={matchOpen}
        onClose={() => setMatchOpen(false)}
        onSubmit={(e) => {
          addMatch(e);
          void syncNow();
        }}
      />
      <ProgramSheet open={programOpen} onClose={() => setProgramOpen(false)} />
    </div>
  );
}
