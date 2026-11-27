import { cx } from '../utils';

/** Speaker with arcs that light up as the volume rises. */
export function VolumeGlyph({ level, muted }: { level: number; muted: boolean }) {
  const active = !muted && level > 0.01;
  return (
    <svg className={cx('vol-glyph', active && 'is-on')} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path className="vol-body" d="M3.6 9.3h3.5L12 4.9v14.2L7.1 14.7H3.6z" fill="currentColor" />
      <path
        className={cx('vol-wave', active && 'w1')}
        d="M15 9.2a4 4 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        className={cx('vol-wave', active && level > 0.45 && 'w2')}
        d="M17.8 6.5a8.4 8.4 0 0 1 0 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {!active && (
        <path d="M15.3 9.5l4.4 5M19.7 9.5l-4.4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}
