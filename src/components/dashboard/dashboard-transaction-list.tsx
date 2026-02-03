import React from 'react';
import { useTranslation } from 'react-i18next';
import { TransactionList } from '@/components/wallet/transaction-list';
import { useGetTransactions } from '@/api/mina/transactions';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import ufoAnimation from '@/animations/ufo.json';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

interface DashboardTransactionListProps {
  publicKey: string;
  displayLoading: boolean;
}

export const DashboardTransactionList: React.FC<
  DashboardTransactionListProps
> = ({ publicKey, displayLoading }) => {
  const { t } = useTranslation();
  const {
    data: transactions,
    isLoading,
    refetch,
  } = useGetTransactions(publicKey, {
    refetchInterval: 30000,
    enabled: !!publicKey,
  });

  const handleRefresh = () => {
    refetch();
  };

  const EmptyState = (
    <div className="flex flex-col items-center justify-center text-muted-foreground text-sm space-y-4 py-8">
      <div className="sm:max-w-[200px] sm:max-h-[200px] max-w-[100px]">
        <LoopingLottie
          animationData={ufoAnimation}
          loopLastSeconds={2}
          loopDelay={5000}
          maxLoops={4}
        />
      </div>
      <p>{t('dashboard.no_transactions')}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-row justify-between items-center w-full">
        <h2 className="text-2xl font-display text-white">
          {t('dashboard.history_title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          title={t('dashboard.refresh_balance')}
          disabled={isLoading || displayLoading}
        >
          <RefreshCcw
            className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      <TransactionList
        transactions={transactions || []}
        isLoading={isLoading}
        className="h-[400px]"
        emptyComponent={EmptyState}
        onTransactionClick={(tx) => {
        }}
      />
    </div>
  );
};
