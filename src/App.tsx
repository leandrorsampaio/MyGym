import { useMemo, useState } from 'react';
import { useStore } from './store/useStore';
import { recommend } from './engine/recommend';
import { nextCType, nextSlot3 } from './engine/rotation';
import { todayISO } from './lib/clock';
import type { SessionId } from './log/types';
import { Hero } from './ui/Hero';
import { ConsistencyChips, StatTiles } from './ui/Stats';
import { WorkoutView } from './ui/WorkoutView';
import { VideoModal } from './ui/VideoModal';
import { LogWorkoutSheet } from './ui/LogWorkoutSheet';
import { LogMatchSheet } from './ui/LogMatchSheet';
import { ProgramSheet } from './ui/JsonDropZone';

type View = 'home' | 'workout';

export default function App() {
  const program = useStore((s) => s.program);
  const log = useStore((s) => s.log);
  const addGym = useStore((s) => s.addGym);
  const addMatch = useStore((s) => s.addMatch);

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

  return (
    <div className="safe-top mx-auto min-h-full max-w-md px-4 pb-10">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold tracking-tight">
          My<span className="text-accent">Gym</span>
        </h1>
        <button onClick={() => setProgramOpen(true)} aria-label="Program settings" className="text-xl text-slate-400">
          ⚙
        </button>
      </header>

      {view === 'home' ? (
        <div className="space-y-4">
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
          setView('home');
          window.scrollTo(0, 0);
        }}
      />

      <LogMatchSheet open={matchOpen} onClose={() => setMatchOpen(false)} onSubmit={addMatch} />
      <ProgramSheet open={programOpen} onClose={() => setProgramOpen(false)} />
    </div>
  );
}
