import * as React from "react";
import { VirtualList } from "@/components/ui/virtual-list";
import { TransactionCard, TransactionCardStatus, TransactionType } from "./transaction-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionCardStatus;
  amount: number;
  fee: number;
  hash: string;
  timestamp: string;
  sender: string;
  receiver: string;
  isIncoming: boolean;
  symbol?: string;
}

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
    <VirtualList
      items={transactions}
      className={className}
      estimateSize={() => 76}
      renderItem={(tx) => (
        <div className="px-4 py-1.5">
          <TransactionCard
            {...tx}
            onClick={() => onTransactionClick?.(tx)}
          />
        </div>
      )}
      emptyComponent={
        emptyComponent || (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
          <p>{t('transactions.no_transactions')}</p>
        </div>
        )
      }
    />
  );
}
