import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

interface CustomQRCodeProps {
  value: string;
  size?: number;
  className?: string;
  color?: string;
  backgroundColor?: string;
}

export const CustomQRCode: React.FC<CustomQRCodeProps> = ({
  value,
  size = 200,
  className,
  color = '#FFFFFF',
  backgroundColor = '#18181B', // zinc-950
}) => {
  const qrData = useMemo(() => {
    try {
      return QRCode.create(value, {
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('Error generating QR code', err);
      return null;
    }
  }, [value]);

  if (!qrData) return null;

  const { modules } = qrData;
  const count = modules.size;
  const data = modules.data;

  // Helper to check if a module is dark
  const isDark = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= count || c >= count) return false;
    return !!data[r * count + c];
  };

  // Identify Finder Patterns
  // Top Left: 0-6, 0-6
  // Top Right: 0-6, count-7 - count-1
  // Bottom Left: count-7 - count-1, 0-6
  const isFinderPattern = (r: number, c: number) => {
    if (r < 7 && c < 7) return true; // Top Left
    if (r < 7 && c >= count - 7) return true; // Top Right
    if (r >= count - 7 && c < 7) return true; // Bottom Left
    return false;
  };

  // Generate dots for normal modules
  const dots = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (isDark(r, c) && !isFinderPattern(r, c)) {
        dots.push(
          <circle
            key={`${r}-${c}`}
            cx={c + 0.5}
            cy={r + 0.5}
            r={0.35} // Adjust radius for dot size
            fill={color}
          />
        );
      }
    }
  }

  // Finder Pattern Component
  const FinderPattern = ({ r, c }: { r: number; c: number }) => (
    <g transform={`translate(${c}, ${r})`}>
      {/* Outer Box */}
      <rect
        x={0.5}
        y={0.5}
        width={6}
        height={6}
        rx={2}
        ry={2}
        fill="none"
        stroke={color}
        strokeWidth={1}
      />
      {/* Inner Box (Dot) */}
      <rect
        x={2}
        y={2}
        width={3}
        height={3}
        rx={1}
        ry={1}
        fill={color}
      />
    </g>
  );

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{
        width: size,
        height: size,
        backgroundColor,
        padding: size * 0.05, // 5% padding
      }}
    >
      <svg
        viewBox={`0 0 ${count} ${count}`}
        style={{ width: '100%', height: '100%' }}
        shapeRendering="geometricPrecision"
      >
        {dots}
        <FinderPattern r={0} c={0} />
        <FinderPattern r={0} c={count - 7} />
        <FinderPattern r={count - 7} c={0} />
      </svg>
    </div>
  );
};
