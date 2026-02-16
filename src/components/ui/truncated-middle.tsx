import React from 'react';
import { useTruncateMiddle } from '@/hooks/use-truncate-middle';
import { cn } from '@/lib/utils';

interface TruncatedMiddleProps {
  text: string;
  className?: string;
  charWidth?: number;
  reservedWidth?: number;
  maxChars?: number; // Fallback max characters
  title?: string;
}

export const TruncatedMiddle: React.FC<TruncatedMiddleProps> = ({
  text,
  className,
  charWidth,
  reservedWidth,
  maxChars = 30, // Fallback: max 30 characters
  title,
}) => {
  const [truncatedText, containerRef] = useTruncateMiddle(text, {
    charWidth,
    reservedWidth,
    maxChars,
  });

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden min-w-0 flex-1', className)}
      title={title || text}
    >
      {truncatedText}
    </div>
  );
};
