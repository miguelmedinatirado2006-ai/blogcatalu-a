import { useState } from 'react';
import { Mountain } from 'lucide-react';

interface EditorialImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function EditorialImage({ src, alt, className = '' }: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EBE8E0] text-[#5C5A54] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Mountain className="w-7 h-7 stroke-[1.5] mb-2 text-[#14532D]/60" />
        <span className="text-xs font-medium tracking-wide max-w-[22ch] line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
