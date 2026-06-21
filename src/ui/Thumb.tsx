export const PLACEHOLDER = '/exercise-placeholder.svg';

/** Exercise thumbnail with a graceful fallback to the bundled placeholder. */
export function Thumb({ src, size }: { src?: string; size: number }) {
  return (
    <img
      src={src || PLACEHOLDER}
      alt=""
      width={size}
      height={size}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(PLACEHOLDER)) e.currentTarget.src = PLACEHOLDER;
      }}
      className="shrink-0 rounded-lg bg-surface2 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
