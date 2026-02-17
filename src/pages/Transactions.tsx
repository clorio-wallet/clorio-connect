import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/dashboard/dashboard-header';
import { TransactionList } from '@/components/wallet/transaction-list';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import ufoAnimation from '@/animations/ufo.json';
import { TransactionDetailsSheet } from '@/components/wallet/transaction-details-sheet';

const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();

  const [selectedTxHash, setSelectedTxHash] = React.useState<string | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

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
    <div className="space-y-6 py-2">
      <AppHeader />

      <div className="space-y-4">
        <h2 className="text-2xl font-display text-white">
          {t('dashboard.history_title', 'History')}
        </h2>

        <TransactionList
          emptyComponent={EmptyState}
          onTransactionClick={(tx: any) => {
            setSelectedTxHash(tx.hash);
            setIsSheetOpen(true);
          }}
        />

        <TransactionDetailsSheet
          hash={selectedTxHash}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      </div>
    </div>
  );
};

export default TransactionsPage;
