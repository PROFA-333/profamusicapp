import { Music2 } from 'lucide-react';
import { useState } from 'react';
import { cx } from '../utils';

export function Artwork({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span className={cx('artwork art-fallback', className)} role="img" aria-label={alt}>
        <Music2 size={22} />
      </span>
    );
  }

  return (
    <img
      className={cx('artwork', className)}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
