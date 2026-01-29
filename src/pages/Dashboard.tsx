import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountCard } from '@/components/wallet/account-card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ViewPrivateKeySheet } from '@/components/wallet/view-private-key-sheet';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import ufoAnimation from '../animations/ufo.json';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { RefreshCcw } from 'lucide-react';
import { WalletActions } from '@/components/wallet/wallet-actions';
import { ReceiveSheet } from '@/components/wallet/receive-sheet';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, resetWallet } = useSessionStore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewKeyDialogOpen, setIsViewKeyDialogOpen] = useState(false);
  const [isReceiveSheetOpen, setIsReceiveSheetOpen] = useState(false);

  const {
    publicKey,
    network,
    account,
    displayLoading,
    healthData,
    minaInfo,
    refetchAccount,
  } = useDashboardData();

  useEffect(() => {
    if (!publicKey) {
      navigate('/welcome');
    }
  }, [publicKey, navigate]);

  const handleLogout = () => {
    logout();
    toast({
      title: t('dashboard.logout_title'),
      description: t('dashboard.logout_desc'),
    });
    navigate('/wallet-unlock');
  };

  const handleDeleteWallet = async () => {
    await resetWallet();
    toast({
      title: t('dashboard.delete_wallet_title'),
      description: t('dashboard.delete_wallet_desc'),
    });
    navigate('/welcome');
  };

  return (
    <div className="space-y-6 py-2">
      <DashboardHeader
        networkName={network.name}
        healthStatus={healthData?.status}
        blockHeight={minaInfo?.height}
        epoch={minaInfo?.epoch}
        slot={minaInfo?.slot}
        displayLoading={displayLoading}
        onRefresh={refetchAccount}
        onLogout={handleLogout}
      />

      <div className="space-y-4">
        <AccountCard
          account={account}
          isLoading={displayLoading}
          explorerUrl={`${network.explorerUrl}/account/${publicKey}`}
          onSelect={() => {}}
          onRename={() => {
            toast({
              title: 'Not Implemented',
              description: 'Renaming accounts will be available soon.',
            });
          }}
          onDelete={() => setIsDeleteDialogOpen(true)}
          onViewPrivateKey={() => setIsViewKeyDialogOpen(true)}
        />
        {/* <WalletActions
          onReceiveClick={() => setIsReceiveSheetOpen(true)}
          disabled={displayLoading || !publicKey}
        /> */}
      </div>

      <div className="flex flex-col items-center justify-center text-muted-foreground text-sm space-y-4">
        <div className="flex flex-row justify-start items-start w-full">
          <h2 className="text-2xl font-display text-white">
            {t('dashboard.history_title')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchAccount()}
            title={t('dashboard.refresh_balance')}
            disabled={displayLoading}
          >
            <RefreshCcw
              className={`h-5 w-5 ${displayLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard.confirm_delete_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.confirm_delete_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWallet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('dashboard.delete_wallet')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewPrivateKeySheet
        open={isViewKeyDialogOpen}
        onOpenChange={setIsViewKeyDialogOpen}
      />

      <ReceiveSheet
        open={isReceiveSheetOpen}
        onOpenChange={setIsReceiveSheetOpen}
        address={publicKey || ''}
      />
    </div>
  );
};

export default DashboardPage;
