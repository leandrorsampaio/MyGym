import { embedUrl } from '../lib/youtube';

/** In-app YouTube player (Shorts or watch links) with an "Open in YouTube" escape hatch. */
export function VideoModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const embed = embedUrl(url);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-sm text-slate-200">{title}</span>
          <button onClick={onClose} aria-label="Close" className="px-2 text-slate-400">
            ✕
          </button>
        </div>
        {/* Shorts are vertical — use a 9:16 box. */}
        <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '9 / 16' }}>
          {embed ? (
            <iframe
              src={embed}
              title={title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-400">Can't embed this video</div>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-xl bg-surface2 py-3 text-center font-medium text-accent"
        >
          Open in YouTube ↗
        </a>
      </div>
    </div>
  );
}
