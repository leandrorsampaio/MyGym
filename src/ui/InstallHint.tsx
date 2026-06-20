import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from '../pwa/persist';

const DISMISS_KEY = 'mygym-install-hint-dismissed';

/**
 * One-time hint nudging iOS users to "Add to Home Screen" — iOS has no install
 * prompt, and installing is what unlocks offline + persistent storage.
 */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    if (isIOS() && !isStandalone() && !dismissed) setShow(true);
  }, []);

  if (!show) return null;
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-slate-200">
      <div className="flex items-start justify-between gap-2">
        <p>
          Install MyGym: tap <b>Share</b> <span aria-hidden>􀈂</span> → <b>Add to Home Screen</b>. This enables
          offline use at the gym and keeps your data safe.
        </p>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setShow(false);
          }}
          aria-label="Dismiss"
          className="text-slate-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
