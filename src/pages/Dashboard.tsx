import React, { useEffect, useState } from 'react';
import { AccountCard } from '@/components/wallet/account-card';
import { useNavigate } from 'react-router-dom';
import { ViewPrivateKeySheet } from '@/components/wallet/view-private-key-sheet';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { AppHeader } from '@/components/dashboard/dashboard-header';
import { WalletSwitcher } from '@/components/wallet/wallet-switcher';
import { WalletActions } from '@/components/wallet/wallet-actions';
import { ReceiveSheet } from '@/components/wallet/receive-sheet';
import { DashboardTransactionList } from '@/components/dashboard/dashboard-transaction-list';
import { useWalletStore } from '@/stores/wallet-store';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isViewKeyDialogOpen, setIsViewKeyDialogOpen] = useState(false);
  const [isReceiveSheetOpen, setIsReceiveSheetOpen] = useState(false);
  const [isWalletSwitcherOpen, setIsWalletSwitcherOpen] = useState(false);

  const { publicKey, network, account, displayLoading, refetchAccount } = useDashboardData();
  const isLedger = useWalletStore((state) => state.accountType === 'ledger');

  useEffect(() => {
    if (!publicKey) {
      navigate('/welcome');
    }
  }, [publicKey, navigate]);

  return (
    <div className="space-y-6 py-2">
      <AppHeader />

      <div className="space-y-4">
        <AccountCard
          account={account}
          isLoading={displayLoading}
          explorerUrl={`${network.explorerUrl}/account/${publicKey}`}
          onSelect={() => {}}
          onViewPrivateKey={isLedger ? undefined : () => setIsViewKeyDialogOpen(true)}
          onSwitchWallet={() => setIsWalletSwitcherOpen(true)}
          onRefreshBalance={refetchAccount}
        />
        <WalletActions
          onReceiveClick={() => setIsReceiveSheetOpen(true)}
          disabled={displayLoading || !publicKey}
        />
      </div>

      <DashboardTransactionList
        publicKey={publicKey || ''}
        displayLoading={displayLoading}
      />

      <ViewPrivateKeySheet
        open={isViewKeyDialogOpen}
        onOpenChange={setIsViewKeyDialogOpen}
      />

      <ReceiveSheet
        open={isReceiveSheetOpen}
        onOpenChange={setIsReceiveSheetOpen}
        address={publicKey || ''}
      />

      <WalletSwitcher
        open={isWalletSwitcherOpen}
        onOpenChange={setIsWalletSwitcherOpen}
      />
    </div>
  );
};

export default DashboardPage;
