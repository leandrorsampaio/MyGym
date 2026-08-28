import { useEffect, useMemo, useState } from 'react';
import { useStore, useHydrated, usePendingCount } from './store/useStore';
import { recommend } from './engine/recommend';
import { nextCType, nextSlot3 } from './engine/rotation';
import { todayISO } from './lib/clock';
import { requestPersistentStorage } from './pwa/persist';
import { initSync, syncNow } from './sync/sync';
import type { LogEntry, SessionId } from './log/types';
import { isGym } from './log/types';
import { Hero } from './ui/Hero';
import { ConsistencyChips, StatTiles } from './ui/Stats';
import { LastActivity } from './ui/LastActivity';
import { Heatmap } from './ui/Heatmap';
import { Highlights } from './ui/Highlights';
import { SessionBreakdown } from './ui/SessionBreakdown';
import { HistoryView } from './ui/HistoryView';
import { WorkoutView } from './ui/WorkoutView';
import { VideoModal } from './ui/VideoModal';
import { LogWorkoutSheet } from './ui/LogWorkoutSheet';
import { LogMatchSheet } from './ui/LogMatchSheet';
import { EntryDetailSheet } from './ui/EntryDetailSheet';
import { ProgramSheet } from './ui/JsonDropZone';
import { InstallHint } from './ui/InstallHint';

type View = 'home' | 'workout' | 'history';

export default function App() {
  const hydrated = useHydrated();
  const authRequired = useStore((s) => s.authRequired);
  const program = useStore((s) => s.program);
  const log = useStore((s) => s.log);
  const addGym = useStore((s) => s.addGym);
  const addMatch = useStore((s) => s.addMatch);
  const deleteEntry = useStore((s) => s.deleteEntry);
  const updateEntry = useStore((s) => s.updateEntry);
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
  const [viewing, setViewing] = useState<LogEntry | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);

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
    <div className="safe-top mx-auto min-h-full max-w-md px-4 pb-10 md:max-w-5xl md:px-6">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold tracking-tight">
          My<span className="text-accent">Gym</span>
        </h1>
        <div className="flex items-center gap-3">
          {pending > 0 && (
            <button
              onClick={() => void syncNow()}
              className="rounded-full bg-surface2 px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
              title="Tap to sync now"
            >
              ☁ {pending} unsynced
            </button>
          )}
          <button
            onClick={() => setProgramOpen(true)}
            aria-label="Program settings"
            className="text-xl text-slate-400 hover:text-slate-100"
          >
            ⚙
          </button>
        </div>
      </header>

      {authRequired && (
        <a
          href="/signin"
          className="mb-4 block rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-sm text-amber-200"
        >
          <span className="font-semibold">Sign in again to back up.</span>
          <span className="block text-xs text-amber-200/70">
            Your session expired — nothing is saved to the cloud until you do. Tap here.
          </span>
        </a>
      )}

      {view === 'home' ? (
        <div className="space-y-4">
          {/* Outside the grid: it renders on iPad too, where it would otherwise
              take a column cell and push the layout out of place. */}
          <InstallHint />
          <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0">
            {/* What to do now. */}
            <div className="space-y-4">
              <Hero program={program} rec={rec} onStart={start} />
              <button
                onClick={() => setMatchOpen(true)}
                className="w-full rounded-xl border border-line bg-surface py-3 font-medium text-slate-200 hover:border-slate-500 hover:bg-surface2"
              >
                ⚽ I played — log it
              </button>
              <LastActivity log={log} today={today} />
              <ConsistencyChips log={log} today={today} />
            </div>
            {/* How it's going. */}
            <div className="space-y-4">
              <Heatmap log={log} today={today} />
              <SessionBreakdown log={log} />
              <Highlights log={log} />
              <StatTiles log={log} />
            </div>
          </div>
          {/* Below the grid, so on a phone this stays where it always was: the last
              thing on the page, after the stats. */}
          <button
            onClick={() => {
              setView('history');
              window.scrollTo(0, 0);
            }}
            className="w-full rounded-xl border border-line bg-surface py-3 font-medium text-slate-200 hover:border-slate-500 hover:bg-surface2"
          >
            📋 View all activity ({log.length})
          </button>
        </div>
      ) : view === 'history' ? (
        <HistoryView
          log={log}
          onBack={() => setView('home')}
          onEdit={(entry) => setEditing(entry)}
          onOpen={(entry) => setViewing(entry)}
          onDelete={(id) => {
            deleteEntry(id);
            void syncNow();
          }}
        />
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

      <EntryDetailSheet
        entry={viewing}
        program={program}
        onClose={() => setViewing(null)}
        onEdit={(entry) => {
          setViewing(null);
          setEditing(entry);
        }}
        onUpdate={(entry) => {
          // Garmin data fetched on open — keep it, so it's ours and never fetched twice.
          updateEntry(entry);
          setViewing(entry);
          void syncNow();
        }}
      />

      {/* Edit an existing log entry (remounts per entry via key so fields pre-fill). */}
      {editing && isGym(editing) && (
        <LogWorkoutSheet
          key={editing.id}
          open
          program={program}
          session={editing.session}
          defaultSlot3={editing.slot3 ?? slot3Next}
          initial={editing}
          title={`Edit Session ${editing.session}`}
          submitLabel="Save changes"
          onClose={() => setEditing(null)}
          onSubmit={(e) => {
            updateEntry({ ...editing, ...e });
            void syncNow();
            setEditing(null);
          }}
        />
      )}
      {editing && !isGym(editing) && (
        <LogMatchSheet
          key={editing.id}
          open
          initial={editing}
          title="Edit football"
          submitLabel="Save changes"
          onClose={() => setEditing(null)}
          onSubmit={(e) => {
            updateEntry({ ...editing, ...e });
            void syncNow();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
