import * as React from "react";
import { motion } from "framer-motion";
import { VirtualList } from "@/components/ui/virtual-list";
import { TransactionCard } from "./transaction-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { Transaction } from "@/api/mina/transactions";

export interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
  className?: string;
  emptyComponent?: React.ReactNode;
}

export function TransactionList({
  transactions,
  isLoading,
  onTransactionClick,
  className,
  emptyComponent,
}: TransactionListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {transactions.length === 0 ? (
        emptyComponent || (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <p>{t('transactions.no_transactions')}</p>
          </div>
        )
      ) : (
        transactions.map((tx, index) => (
          <motion.div
            key={tx.id || tx.hash}
            className="px-4 py-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <TransactionCard
              {...tx}
              onClick={() => onTransactionClick?.(tx)}
            />
          </motion.div>
        ))
      )}
    </div>
  );
}
