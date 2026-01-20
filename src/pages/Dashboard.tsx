import React, { useEffect, useState } from 'react';
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
import { useMinimumLoading } from '@/hooks/use-minimum-loading';
import { NetworkBadge } from '@/components/wallet';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import ufoAnimation from '../animations/ufo.json';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, resetWallet } = useSessionStore();
  const { publicKey } = useWalletStore();
  const { networkId, balancePollInterval } = useSettingsStore();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      title: 'Logged Out',
      description: 'Your session has been cleared.',
    });
    navigate('/wallet-unlock');
  };

  const handleDeleteWallet = async () => {
    await resetWallet();
    toast({
      title: 'Wallet Deleted',
      description: 'Your wallet has been removed from this device.',
    });
    navigate('/welcome');
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
            title="Refresh Balance"
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
            title="Logout"
          >
            <Lock className="h-5 w-5" />
          </Button>

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your wallet from this device. Make sure you have backed up
                  your Secret Recovery Phrase or Private Key.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteWallet}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Wallet
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="space-y-4">
        <AccountCard
          account={{
            name: 'Main Account',
            address: publicKey || '',
            balance: balanceMina.toString(),
            symbol: 'MINA',
          }}
          isActive={true}
          isLoading={displayLoading}
          explorerUrl={network.explorerUrl}
          onDelete={() => setIsDeleteDialogOpen(true)}
          onViewPrivateKey={() => {
            toast({
              title: 'Not Implemented',
              description: 'View private key functionality coming soon.',
            });
          }}
          onRename={() => {
            toast({
              title: 'Not Implemented',
              description: 'Rename functionality coming soon.',
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
        <p>No recent transactions</p>
      </div>
    </div>
  );
};

export default DashboardPage;
