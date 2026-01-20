import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton, AnimatedNumber } from "@/components/ui";

interface BalanceDisplayProps {
  balance: string | number;
  symbol: string;
  decimals?: number;
  showFiat?: boolean;
  fiatValue?: string | number;
  fiatCurrency?: string;
  loading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function BalanceDisplay({
  balance,
  symbol,
  decimals = 4,
  showFiat = false,
  fiatValue,
  fiatCurrency = "USD",
  loading = false,
  size = "md",
  className,
}: BalanceDisplayProps) {
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const sizeClasses = {
    sm: { balance: "text-lg", fiat: "text-xs" },
    md: { balance: "text-2xl", fiat: "text-sm" },
    lg: { balance: "text-3xl", fiat: "text-base" },
    xl: { balance: "text-4xl", fiat: "text-lg" },
  };

  React.useEffect(() => {
    if (!loading) {
      setIsFirstLoad(false);
    }
  }, [loading]);

  const showSkeleton = loading && isFirstLoad;
  const numericBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
  const numericFiatValue = typeof fiatValue === 'string' ? parseFloat(fiatValue) : fiatValue;

  const fiatSymbol =
    fiatCurrency === "USD" ? "$" : fiatCurrency === "EUR" ? "€" : fiatCurrency;

  return (
    <div className={cn("relative", className)}>
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
              className={cn("h-8 w-32", size === "lg" && "h-10 w-40")}
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
                "font-semibold tracking-tight",
                sizeClasses[size].balance
              )}
            >
              <AnimatedNumber
                value={numericBalance}
                decimals={decimals}
                className="tabular-nums"
              />
              {" "}
              <span className="text-muted-foreground font-medium">
                {symbol}
              </span>
            </div>
            {showFiat && fiatValue !== undefined && (
              <div
                className={cn(
                  "text-muted-foreground",
                  sizeClasses[size].fiat
                )}
              >
                ≈ {fiatSymbol}
                <AnimatedNumber
                  value={numericFiatValue as number}
                  decimals={2}
                  className="tabular-nums"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
