import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton, AnimatedNumber } from '@/components/ui';

interface BalanceDisplayProps {
  balance: string | number;
  symbol: string;
  decimals?: number;
  showFiat?: boolean;
  fiatValue?: string | number;
  fiatCurrency?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function BalanceDisplay({
  balance,
  symbol,
  decimals = 4,
  showFiat = false,
  fiatValue,
  fiatCurrency = 'USD',
  loading = false,
  size = 'md',
  className,
}: BalanceDisplayProps) {
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const sizeClasses = {
    sm: { integer: 'text-xl', decimal: 'text-sm', fiat: 'text-xs' },
    md: { integer: 'text-3xl', decimal: 'text-xl', fiat: 'text-sm' },
    lg: { integer: 'text-4xl', decimal: 'text-2xl', fiat: 'text-base' },
    xl: { integer: 'text-5xl', decimal: 'text-3xl', fiat: 'text-lg' },
  };

  React.useEffect(() => {
    if (!loading) {
      setIsFirstLoad(false);
    }
  }, [loading]);

  const showSkeleton = loading && isFirstLoad;
  const numericBalance =
    typeof balance === 'string'
      ? parseFloat(balance.replace(/,/g, ''))
      : balance;
  const numericFiatValue =
    typeof fiatValue === 'string'
      ? parseFloat(fiatValue.replace(/[^0-9.-]+/g, ''))
      : fiatValue;

  const fiatSymbol =
    fiatCurrency === 'USD' ? '$' : fiatCurrency === 'EUR' ? '€' : fiatCurrency;

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {showSkeleton ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1"
          >
            <Skeleton
              className={cn('h-8 w-32', size === 'lg' && 'h-10 w-40')}
            />
            {showFiat && <Skeleton className="h-4 w-20" />}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <div
              className={cn(
                'font-semibold tracking-tight flex items-baseline gap-1',
              )}
            >
              <AnimatedNumber
                value={numericBalance}
                decimals={decimals}
                className="tabular-nums"
                integerClassName={sizeClasses[size].integer}
                decimalClassName={cn(
                  'text-muted-foreground',
                  sizeClasses[size].decimal,
                )}
                duration={0.8}
              />{' '}
              <span className="text-muted-foreground font- text-md">
                {symbol}
              </span>
            </div>
            {showFiat && fiatValue !== undefined && (
              <div
                className={cn('text-muted-foreground', sizeClasses[size].fiat)}
              >
                ≈ {fiatSymbol}
                <AnimatedNumber
                  value={numericFiatValue as number}
                  decimals={2}
                  className="tabular-nums"
                  duration={0.8}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
