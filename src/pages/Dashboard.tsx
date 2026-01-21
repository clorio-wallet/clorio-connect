import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccountCard } from '@/components/wallet/account-card';
import { Button } from '@/components/ui/button';
import { Lock, BookPlus, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { DEFAULT_NETWORKS } from '@/lib/networks';
import { useAccountByKeyQuery } from '@/graphql/generated';
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
import { useMinimumLoading } from '@/hooks/use-minimum-loading';
import { NetworkBadge } from '@/components/wallet';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import ufoAnimation from '../animations/ufo.json';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, resetWallet } = useSessionStore();
  const { publicKey } = useWalletStore();
  const { networkId, balancePollInterval } = useSettingsStore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewKeyDialogOpen, setIsViewKeyDialogOpen] = useState(false);

  const network = DEFAULT_NETWORKS[networkId] || DEFAULT_NETWORKS.mainnet;
  const pollIntervalMs =
    balancePollInterval > 0 ? balancePollInterval * 60 * 1000 : 0;

  useEffect(() => {
    if (!publicKey) {
      navigate('/welcome');
    }
  }, [publicKey, navigate]);

  const { data, loading, refetch } = useAccountByKeyQuery({
    variables: { publicKey: publicKey || '' },
    skip: !publicKey,
    pollInterval: pollIntervalMs,
    fetchPolicy: 'cache-and-network',
  });

  const displayLoading = useMinimumLoading(loading, 1000);

  const balanceRaw = data?.accountByKey?.balance?.total || 0;
  const balanceMina = Number(balanceRaw) / 1e9;

  const handleRefresh = () => {
    refetch();
  };

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

  const handleViewPrivateKey = () => {
    setIsViewKeyDialogOpen(true);
  };

  return (
    <div className="space-y-6 py-2">
      <header className="flex justify-between items-center">
        <NetworkBadge network={network.name} />
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            title={t('dashboard.refresh_balance')}
            disabled={displayLoading}
          >
            <RefreshCcw
              className={`h-5 w-5 ${displayLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/playground')}
          >
            <BookPlus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title={t('dashboard.logout')}
          >
            <Lock className="h-5 w-5" />
          </Button>

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('dashboard.confirm_delete_title')}</AlertDialogTitle>
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
        </div>
      </header>

      <div className="space-y-4">
        <AccountCard
          account={{
            name: t('dashboard.title'),
            address: publicKey || '',
            balance: balanceMina.toString(),
            symbol: 'MINA',
          }}
          isActive={true}
          isLoading={displayLoading}
          explorerUrl={network.explorerUrl}
          onDelete={() => setIsDeleteDialogOpen(true)}
          onViewPrivateKey={handleViewPrivateKey}
          onRename={() => {
            toast({
              title: t('dashboard.not_implemented'),
              description: t('dashboard.rename_coming_soon'),
            });
          }}
        />
      </div>

      <div className="flex flex-col items-center justify-center text-muted-foreground text-sm py-8 space-y-4">
        <div className="w-[200px] h-[200px]">
          <LoopingLottie
            animationData={ufoAnimation}
            loopLastSeconds={2}
            loopDelay={5000}
          />
        </div>
        <p>{t('dashboard.no_transactions')}</p>
      </div>
    </div>
  );
};

export default DashboardPage;
