import type { LogEntry } from '../log/types';
import { isGym, isMatchSport, sportIcon } from '../log/types';
import type { Program } from '../program/schema';
import { Sheet } from './Sheet';
import { GarminActivity } from './GarminActivity';

/** Turn a stored rotation key back into the label the program gives it. */
function slot3Label(program: Program, key: string): string {
  const slot = program.coreFinisher.slots.find((s) => s.rotates) ?? program.coreFinisher.slots[2];
  return slot?.options.find((o) => o.key === key)?.name ?? key;
}

function cTypeLabel(program: Program, key: string): string {
  return program.workouts.C.alternates.find((a) => a.key === key)?.label ?? key;
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-right text-sm text-slate-100">{children}</span>
    </div>
  );
}

/** Read-only detail for one log entry — everything stored on it, Garmin data included. */
export function EntryDetailSheet({
  entry,
  program,
  onClose,
  onEdit,
}: {
  entry: LogEntry | null;
  program: Program;
  onClose: () => void;
  onEdit: (entry: LogEntry) => void;
}) {
  if (!entry) return null;
  const gym = isGym(entry);

  return (
    <Sheet
      open
      onClose={onClose}
      title={gym ? `Session ${entry.session}` : isMatchSport(entry.sport) ? 'Match' : 'Training'}
    >
      <div className="space-y-4">
        <div>
          <div className="text-lg font-semibold capitalize text-slate-100">
            {gym ? `${'🏋️'} Session ${entry.session}` : `${sportIcon(entry.sport)} ${entry.sport}`}
          </div>
          <div className="text-sm text-slate-500">{longDate(entry.date)}</div>
        </div>

        <div className="divide-y divide-line rounded-xl border border-line px-3">
          {gym ? (
            <>
              <Row label="Completion">{entry.completion === 'complete' ? 'Complete' : 'T1 only'}</Row>
              {entry.session === 'C' && entry.cType && (
                <Row label="Conditioning">{cTypeLabel(program, entry.cType)}</Row>
              )}
              {entry.slot3 && <Row label="Core slot-3">{slot3Label(program, entry.slot3)}</Row>}
              {entry.legAppend && <Row label="Extra">Squat 2×5 + RDL 2×8</Row>}
            </>
          ) : (
            isMatchSport(entry.sport) && <Row label="Goals">{entry.goals}</Row>
          )}
          <Row label="Performance">
            <span className="text-amber-400">
              {'★'.repeat(entry.rating)}
              <span className="text-slate-600">{'☆'.repeat(3 - entry.rating)}</span>
            </span>
          </Row>
        </div>

        {!gym && (entry.garmin || entry.garminUrl) && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Garmin</span>
              {entry.garmin?.name && <span className="text-sm text-slate-400">{entry.garmin.name}</span>}
            </div>

            {entry.garmin ? (
              <GarminActivity garmin={entry.garmin} />
            ) : (
              <p className="text-xs text-slate-500">
                Link saved, but the activity data hasn't been fetched yet — tap Edit and press Fetch.
              </p>
            )}

            {entry.garminUrl && (
              <a
                href={entry.garminUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-line py-2.5 text-center text-sm text-accent hover:border-slate-500 hover:bg-surface2"
              >
                Open in Garmin Connect ↗
              </a>
            )}
          </div>
        )}

        <button
          onClick={() => onEdit(entry)}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-bg hover:bg-accentDim active:bg-accentDim"
        >
          Edit
        </button>
      </div>
    </Sheet>
  );
}
