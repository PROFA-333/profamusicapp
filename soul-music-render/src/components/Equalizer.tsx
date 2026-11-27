import { cx } from '../utils';

/** Spotify-style bars shown on the track that is currently playing. */
export function Equalizer({ playing = true, className }: { playing?: boolean; className?: string }) {
  return (
    <span className={cx('equalizer', playing && 'is-playing', className)} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
