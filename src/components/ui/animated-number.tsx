import * as React from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  integerClassName?: string;
  decimalClassName?: string;
}

export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  className,
  integerClassName,
  decimalClassName,
  duration = 0.8,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);

  React.useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeInOut',
    });
    return controls.stop;
  }, [motionValue, value, duration]);

  const display = useTransform(motionValue, (current) =>
    current.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  const separator = React.useMemo(() => {
    const sep = (1.1).toLocaleString(undefined).replace(/\d/g, '');
    return sep || '.';
  }, []);

  const integerPart = useTransform(display, (v) => v.split(separator)[0]);
  const decimalPart = useTransform(display, (v) => {
    const parts = v.split(separator);
    return parts.length > 1 ? separator + parts[1] : '';
  });

  if (integerClassName || decimalClassName) {
    return (
      <span
        className={cn('tabular-nums inline-flex items-baseline', className)}
      >
        {prefix}
        <motion.span className={integerClassName}>{integerPart}</motion.span>
        <motion.span className={decimalClassName}>{decimalPart}</motion.span>
        {suffix}
      </span>
    );
  }

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}
