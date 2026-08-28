import { useEffect, type ReactNode } from 'react';

/**
 * A bottom sheet on phones; a centred modal from `md` up, where a panel glued to the
 * bottom of a large window reads as a phone emulator. Escape closes it either way.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 md:items-center md:justify-center md:p-6"
      onClick={onClose}
    >
      <div
        className="safe-bottom max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 md:w-full md:max-w-lg md:rounded-2xl md:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-slate-400 hover:text-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
