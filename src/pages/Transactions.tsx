import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { TransactionList } from '@/components/wallet/transaction-list';
import { useGetTransactions } from '@/api/mina/transactions';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import ufoAnimation from '@/animations/ufo.json';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ArrowLeft } from 'lucide-react';

const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useSessionStore();
  const { toast } = useToast();

  const {
    publicKey,
    network,
    healthData,
    minaInfo,
    displayLoading,
    refetchAccount,
  } = useDashboardData();

  const {
    data: transactions,
    isLoading,
    refetch,
  } = useGetTransactions(publicKey || '', {
    refetchInterval: 30000,
    enabled: !!publicKey,
  });

  const handleLogout = () => {
    logout();
    toast({
      title: t('dashboard.logout_title'),
      description: t('dashboard.logout_desc'),
    });
    navigate('/wallet-unlock');
  };

  const handleRefresh = () => {
    refetch();
    refetchAccount();
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
    <div className="space-y-6 py-2">
      <DashboardHeader
        networkName={network.name}
        healthStatus={healthData?.status}
        blockHeight={minaInfo?.height}
        epoch={minaInfo?.epoch}
        slot={minaInfo?.slot}
        displayLoading={displayLoading}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />

      <div className="space-y-4">
        <div className="flex flex-row items-center gap-2">
          <div className="flex flex-row justify-between items-center w-full">
            <h2 className="text-2xl font-display text-white">
              {t('dashboard.history_title', 'History')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || displayLoading}
            >
              <RefreshCcw
                className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        <TransactionList
          transactions={transactions || []}
          isLoading={isLoading}
          emptyComponent={EmptyState}
          onTransactionClick={(tx) => {
            // TODO: Open transaction details
            console.log('Transaction clicked:', tx);
          }}
        />
      </div>
    </div>
  );
};

export default TransactionsPage;
