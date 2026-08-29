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
import { ConsistencyChips } from './ui/Stats';
import { LastActivity } from './ui/LastActivity';
import { Heatmap } from './ui/Heatmap';
import { ReviewView } from './ui/ReviewView';
import { HistoryView } from './ui/HistoryView';
import { WorkoutView, type Optional } from './ui/WorkoutView';
import { VideoModal } from './ui/VideoModal';
import { LogWorkoutSheet } from './ui/LogWorkoutSheet';
import { LogMatchSheet } from './ui/LogMatchSheet';
import { EntryDetailSheet } from './ui/EntryDetailSheet';
import { ProgramSheet } from './ui/JsonDropZone';
import { InstallHint } from './ui/InstallHint';
import { BottomNav, TopNav } from './ui/NavTabs';
import type { View } from './views';

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

  const [view, setView] = useState<View>('train');
  const [activeSession, setActiveSession] = useState<SessionId>(rec.nextSession);
  // The one thing a running session tracks: whether the optional tier is in.
  const [optional, setOptional] = useState<Optional>('undecided');
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [viewing, setViewing] = useState<LogEntry | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const go = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  const start = (s: SessionId) => {
    setActiveSession(s);
    setOptional('undecided');
    go('workout');
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
    <div className="safe-top mx-auto min-h-full max-w-md px-4 pb-24 md:max-w-5xl md:px-6 md:pb-10">
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

      {view !== 'workout' && <TopNav view={view} onGo={go} />}

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

      {view === 'train' ? (
        // The daily job: what to do, and logging what you did. Nothing to read.
        <div className="space-y-4 md:mx-auto md:max-w-2xl">
          <InstallHint />
          <Hero program={program} rec={rec} onStart={start} />
          <button
            onClick={() => setMatchOpen(true)}
            className="w-full rounded-xl border border-line bg-surface py-3 font-medium text-slate-200 hover:border-slate-500 hover:bg-surface2"
          >
            ⚽ I played — log it
          </button>
          <LastActivity log={log} today={today} />
          <ConsistencyChips log={log} today={today} />

          {/* The overview before you commit — read-only here, so it never competes with
              the decision above it. Tapping through goes to History. */}
          <div className="pt-2">
            <Heatmap log={log} today={today} compact onOpenAll={() => go('history')} />
          </div>
        </div>
      ) : view === 'history' ? (
        // What you did: the calendar and the list, which open into entry detail.
        <div className="md:mx-auto md:max-w-3xl">
          <HistoryView log={log} onOpen={(entry) => setViewing(entry)} />
        </div>
      ) : view === 'review' ? (
        <ReviewView
          log={log}
          today={today}
          onEntry={(entry) => {
            updateEntry(entry);
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
          optional={optional}
          onOptional={setOptional}
          onPlay={(url, title) => setVideo({ url, title })}
          onBack={() => go('train')}
          onFinish={() => setFinishOpen(true)}
        />
      )}

      {video && <VideoModal url={video.url} title={video.title} onClose={() => setVideo(null)} />}

      <LogWorkoutSheet
        /* Remount when the tier decision changes: the sheet reads defaultCompletion into
           useState, which only runs on mount, so without this it keeps the preselection
           from whenever it first rendered. */
        key={`finish-${optional}`}
        open={finishOpen}
        program={program}
        session={activeSession}
        defaultCType={cType}
        defaultSlot3={slot3Next}
        defaultLegAppend={legAppend}
        defaultCompletion={optional === 'added' ? 'complete' : 't1'}
        onClose={() => setFinishOpen(false)}
        onSubmit={(e) => {
          addGym(e);
          void syncNow();
          go('train');
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

      {view !== 'workout' && <BottomNav view={view} onGo={go} />}

      <EntryDetailSheet
        entry={viewing}
        program={program}
        onClose={() => setViewing(null)}
        onEdit={(entry) => {
          setViewing(null);
          setEditing(entry);
        }}
        onDelete={(id) => {
          setViewing(null);
          deleteEntry(id);
          void syncNow();
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
