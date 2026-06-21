import { useState } from 'react';
import { Sheet } from './Sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { useStore } from '../store/useStore';

/** Drag & drop (or tap to pick) a program JSON file to replace the current program. */
export function ProgramSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const program = useStore((s) => s.program);
  const loadProgram = useStore((s) => s.loadProgram);
  const resetProgram = useStore((s) => s.resetProgram);
  const replaceLog = useStore((s) => s.replaceLog);
  const logCount = useStore((s) => s.log.length);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setOk(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const err = loadProgram(json);
      if (err) setError(err);
      else setOk(`Loaded program "${json.version ?? '?'}".`);
    } catch (e) {
      setError(`Not valid JSON: ${(e as Error).message}`);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Training program">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Current version: <span className="text-slate-100">{program.version}</span>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(program, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `mygym-program-${program.version}.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-accent"
          >
            ↓ Download JSON
          </button>
        </div>

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
            if (f) handleFile(f);
          }}
          className={`block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center ${
            dragging ? 'border-accent bg-accent/5' : 'border-line'
          }`}
        >
          <div className="text-slate-300">Drop a program JSON here</div>
          <div className="mt-1 text-xs text-slate-500">or tap to choose a file</div>
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        {error && (
          <pre className="whitespace-pre-wrap rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{error}</pre>
        )}
        {ok && <div className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{ok}</div>}

        <button onClick={resetProgram} className="w-full rounded-xl border border-line py-2 text-sm text-slate-300">
          Reset to built-in program
        </button>

        <div className="border-t border-line pt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Activity data ({logCount} entries)
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={logCount === 0}
            className="w-full rounded-xl border border-line py-2 text-sm text-red-300 disabled:opacity-40"
          >
            Clear all activity
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all activity?"
        message={`This permanently deletes all ${logCount} logged ${
          logCount === 1 ? 'entry' : 'entries'
        }. This can't be undone.`}
        confirmLabel="Clear all"
        danger
        onConfirm={() => {
          replaceLog([]);
          setOk('Cleared all activity.');
          setError(null);
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </Sheet>
  );
}
