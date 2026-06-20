import type { Rating } from '../log/types';

export function StarRating({
  value,
  onChange,
  size = 'lg',
}: {
  value: Rating;
  onChange: (r: Rating) => void;
  size?: 'sm' | 'lg';
}) {
  const cls = size === 'lg' ? 'text-4xl' : 'text-xl';
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="rating">
      {([1, 2, 3] as Rating[]).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`${cls} leading-none transition ${n <= value ? 'text-amber-400' : 'text-line'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** Read-only compact stars for stats. */
export function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="text-amber-400">
      {'★'.repeat(rounded)}
      <span className="text-line">{'★'.repeat(Math.max(0, 3 - rounded))}</span>
    </span>
  );
}
