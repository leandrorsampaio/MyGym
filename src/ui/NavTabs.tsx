import type { View } from '../views';

/**
 * The app's three destinations. Each has one job, so the page you use daily (Today)
 * isn't buried under the pages you read monthly.
 *
 * Rendered twice by App: a thumb-reachable bottom bar on the phone, and an inline row
 * under the header on a desktop viewport. The workout runner deliberately hides it —
 * mid-session you want the session, not navigation.
 */
export const TABS: { view: View; label: string; icon: string }[] = [
  { view: 'today', label: 'Today', icon: '🏠' },
  { view: 'log', label: 'Log', icon: '📋' },
  { view: 'progress', label: 'Progress', icon: '📈' },
];

export function BottomNav({ view, onGo }: { view: View; onGo: (v: View) => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <button
            key={t.view}
            onClick={() => onGo(t.view)}
            aria-current={view === t.view ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              view === t.view ? 'text-accent' : 'text-slate-500'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function TopNav({ view, onGo }: { view: View; onGo: (v: View) => void }) {
  return (
    <nav className="mb-4 hidden gap-1 border-b border-line md:flex">
      {TABS.map((t) => (
        <button
          key={t.view}
          onClick={() => onGo(t.view)}
          aria-current={view === t.view ? 'page' : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            view === t.view
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-400 hover:text-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
