import { useState } from 'react';
import { Sheet } from './Sheet';
import { useStore, usePendingCount } from '../store/useStore';
import { backupFilename, buildBackup, parseBackup } from '../log/backup';
import { nowISO } from '../lib/clock';

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Drop target styled like the rest of the sheet; handles drag, drop and tap-to-pick. */
function DropZone({ label, hint, onFile }: { label: string; hint: string; onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center ${
        dragging ? 'border-accent bg-accent/5' : 'border-line'
      }`}
    >
      <div className="text-slate-300">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
      <input
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

/** Settings: swap the training program, and back up / restore the activity log. */
/**
 * Cloudflare Access's own logout, on the team domain. Deliberately not the same-origin
 * `/cdn-cgi/access/logout`: that is a navigation our service worker would answer from the
 * precache, so the sign-out would never reach Access at all.
 */
const ACCESS_LOGOUT_URL = 'https://leandrorsampaio.cloudflareaccess.com/cdn-cgi/access/logout';

export function ProgramSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const program = useStore((s) => s.program);
  const loadProgram = useStore((s) => s.loadProgram);
  const log = useStore((s) => s.log);
  const importEntries = useStore((s) => s.importEntries);
  const pending = usePendingCount();

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [logOk, setLogOk] = useState<string | null>(null);

  const handleProgramFile = async (file: File) => {
    setError(null);
    setOk(null);
    try {
      const json = JSON.parse(await file.text());
      const err = loadProgram(json);
      if (err) setError(err);
      else setOk(`Loaded program "${json.version ?? '?'}".`);
    } catch (e) {
      setError(`Not valid JSON: ${(e as Error).message}`);
    }
  };

  const handleLogFile = async (file: File) => {
    setLogError(null);
    setLogOk(null);
    try {
      const res = parseBackup(JSON.parse(await file.text()));
      if ('error' in res) {
        setLogError(res.error);
        return;
      }
      const merged = importEntries(res.entries);
      setLogOk(
        merged === 0
          ? `Nothing new — all ${res.entries.length} entries were already here.`
          : `Restored ${merged} of ${res.entries.length} entries.`,
      );
    } catch (e) {
      setLogError(`Not valid JSON: ${(e as Error).message}`);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Program version: <span className="text-slate-100">{program.version}</span>
            </div>
            <button
              onClick={() => downloadJson(`mygym-program-${program.version}.json`, program)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-accent"
            >
              ↓ Download JSON
            </button>
          </div>

          <DropZone
            label="Drop a program JSON here"
            hint="or tap to choose a file"
            onFile={handleProgramFile}
          />

          {error && (
            <pre className="whitespace-pre-wrap rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</pre>
          )}
          {ok && <div className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{ok}</div>}
        </section>

        <section className="space-y-3 border-t border-line pt-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Activity log: <span className="text-slate-100">{log.length}</span>{' '}
              {log.length === 1 ? 'entry' : 'entries'}
              {pending > 0 && <span className="text-amber-400"> · {pending} not backed up</span>}
            </div>
            <button
              onClick={() => {
                const now = nowISO();
                downloadJson(backupFilename(now), buildBackup(log, now));
              }}
              disabled={log.length === 0}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-accent disabled:opacity-40"
            >
              ↓ Download log
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Your log lives on this phone. Save a copy somewhere safe — it doesn't depend on the
            cloud backup working.
          </p>

          <DropZone
            label="Restore a log backup"
            hint="merges by entry — nothing is overwritten with older data"
            onFile={handleLogFile}
          />

          {logError && (
            <pre className="whitespace-pre-wrap rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
              {logError}
            </pre>
          )}
          {logOk && <div className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{logOk}</div>}
        </section>

        {/*
          There is no app-level account — Cloudflare Access is the whole of the auth — so
          these are links into Access itself, on its own domain where no service worker can
          intercept them. Sign in is the way out of a lapsed session: while it is lapsed the
          worker cannot fetch a new /sw.js, so the app quietly stops updating.
        */}
        <section className="space-y-2 border-t border-line pt-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Session</div>
          <div className="flex gap-2">
            <a
              href="/signin"
              className="flex-1 rounded-lg border border-line py-2 text-center text-sm text-accent hover:border-slate-500 hover:bg-surface2"
            >
              Sign in again
            </a>
            <a
              href={ACCESS_LOGOUT_URL}
              className="flex-1 rounded-lg border border-line py-2 text-center text-sm text-slate-400 hover:border-slate-500 hover:bg-surface2"
            >
              Log out
            </a>
          </div>
          <p className="text-xs text-slate-600">
            Signing in again is also the fix if the app seems stuck on an old version: an expired
            session blocks the update check.
          </p>
        </section>
      </div>
    </Sheet>
  );
}
