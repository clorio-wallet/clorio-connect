import { useEffect, useState, useRef } from 'react';
import { truncateMiddle } from '@/lib/utils';

interface UseTruncateMiddleOptions {
  charWidth?: number; // approximate character width in pixels
  reservedWidth?: number; // extra pixels to reserve
  maxChars?: number; // fallback max characters if ResizeObserver doesn't work
}

export function useTruncateMiddle(
  text: string,
  options: UseTruncateMiddleOptions = { charWidth: 8, reservedWidth: 20, maxChars: 30 }
): [string, React.RefObject<HTMLDivElement | null>] {
  const containerRef = useRef<HTMLDivElement>(null);
  const [truncatedText, setTruncatedText] = useState(() => 
    text ? truncateMiddle(text, options.maxChars || 30) : text
  );
  const { charWidth = 8, reservedWidth = 20, maxChars = 30 } = options;

  useEffect(() => {
    const updateTruncation = () => {
      if (!containerRef.current || !text) {
        setTruncatedText(text);
        return;
      }

      const containerWidth = containerRef.current.clientWidth;
      // If no width is available yet, wait for next measure
      if (containerWidth <= 0) {
        return;
      }

      // Calculate how many characters can fit
      const availableWidth = Math.max(containerWidth - reservedWidth, 0);
      const calculatedMaxChars = Math.max(Math.floor(availableWidth / charWidth), 3);
      
      // Apply fallback max to prevent overflow
      const finalMaxChars = Math.min(calculatedMaxChars, maxChars);

      setTruncatedText(truncateMiddle(text, finalMaxChars));
    };

    // Small delay to ensure layout is complete
    const timeoutId = setTimeout(updateTruncation, 0);

    // Create ResizeObserver to handle dynamic width changes
    const resizeObserver = new ResizeObserver(updateTruncation);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [text, charWidth, reservedWidth, maxChars]);

  return [truncatedText, containerRef];
}
