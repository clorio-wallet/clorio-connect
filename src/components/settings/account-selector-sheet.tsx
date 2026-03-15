import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Key,
  HardDrive,
  ChevronRight,
  Trash2,
  Plus,
} from 'lucide-react';
import { useWalletStore } from '@/stores/wallet-store';
import { AddWalletDialog } from '@/components/wallet/add-wallet-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatAddress } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { WalletEntry } from '@/lib/types/vault';

interface AccountSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WalletTypeIcon: React.FC<{ type: WalletEntry['type'] }> = ({ type }) => {
  switch (type) {
    case 'ledger':
      return <HardDrive className="w-4 h-4" />;
    case 'mnemonic':
    case 'privateKey':
    case 'seed':
    default:
      return <Key className="w-4 h-4" />;
  }
};

const WalletTypeBadge: React.FC<{ type: WalletEntry['type'] }> = ({ type }) => {
  const { t } = useTranslation();

  const typeLabels: Record<WalletEntry['type'], string> = {
    mnemonic: t('wallets.wallet_types.mnemonic', 'Mnemonic'),
    privateKey: t('wallets.wallet_types.privateKey', 'Private Key'),
    ledger: t('wallets.wallet_types.ledger', 'Ledger'),
    seed: t('wallets.wallet_types.seed', 'Seed'),
  };

  const typeColors: Record<WalletEntry['type'], string> = {
    mnemonic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    privateKey: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    ledger: 'bg-green-500/10 text-green-500 border-green-500/20',
    seed: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };

  return (
    <Badge variant="outline" className={cn('text-xs', typeColors[type])}>
      <WalletTypeIcon type={type} />
      <span className="ml-1">{typeLabels[type]}</span>
    </Badge>
  );
};

export function AccountSelectorSheet({
  open,
  onOpenChange,
}: AccountSelectorSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { wallets, activeWalletId, setActiveWallet, loadWallets, removeWallet } =
    useWalletStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const [deleteWalletId, setDeleteWalletId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isAddWalletOpen, setIsAddWalletOpen] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      await loadWallets();
    } catch (error) {
      console.error('Failed to load wallets:', error);
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('wallets.errors.load_failed', 'Failed to load wallets'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadWallets, toast, t]);

  // Load wallets when sheet opens
  React.useEffect(() => {
    if (open) {
      handleRefresh();
    }
  }, [open, handleRefresh]);

  const handleWalletSelect = async (walletId: string) => {
    if (walletId === activeWalletId) {
      onOpenChange(false);
      return;
    }

    setSwitchingId(walletId);
    try {
      await setActiveWallet(walletId);

      const wallet = wallets.find((w) => w.id === walletId);
      toast({
        variant: 'success',
        title: t('wallets.switch_success', 'Wallet switched'),
        description: t(
          'wallets.switch_success_desc',
          wallet ? `Now using "${wallet.name}"` : 'Active wallet updated',
        ),
      });

      setTimeout(() => {
        onOpenChange(false);
      }, 300);
    } catch (error) {
      console.error('Failed to switch wallet:', error);
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.switch_failed',
          'Failed to switch wallet',
        ),
      });
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDeleteWallet = async () => {
    if (!deleteWalletId || wallets.length <= 1) return;

    setIsDeleting(true);
    try {
      await removeWallet(deleteWalletId);
      const deletedWallet = wallets.find((wallet) => wallet.id === deleteWalletId);
      toast({
        variant: 'success',
        title: t('wallets.delete_success', 'Wallet deleted'),
        description: t(
          'wallets.delete_success_desc',
          deletedWallet
            ? `"${deletedWallet.name}" has been removed`
            : 'Wallet has been removed',
        ),
      });
      setDeleteWalletId(null);
      await loadWallets();
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.delete_failed',
          'Failed to delete wallet',
        ),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-h-[85vh]">
        <BottomSheetHeader>
          <BottomSheetTitle>
            {t('settings.select_account', 'Select Account')}
          </BottomSheetTitle>
          <BottomSheetDescription>
            {t(
              'settings.select_account_desc',
              'Choose which wallet to use as active',
            )}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-3">
          {/* Wallets List */}
          {isLoading && wallets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('wallets.no_wallets', 'No wallets found')}
            </div>
          ) : (
            wallets.map((wallet) => {
              const isActive = wallet.id === activeWalletId;
              const isSwitching = wallet.id === switchingId;
              const canDelete = wallets.length > 1;

              return (
                <div
                  key={wallet.id}
                  className={cn(
                    'w-full p-4 rounded-lg border transition-all',
                    'hover:bg-accent/50 hover:border-primary/50',
                    isActive && 'bg-primary/5 border-primary',
                    isSwitching && 'opacity-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => handleWalletSelect(wallet.id)}
                      disabled={isSwitching || isDeleting}
                      className={cn(
                        'flex-1 min-w-0 text-left',
                        (isSwitching || isDeleting) && 'cursor-not-allowed',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">
                          {wallet.name}
                        </h3>
                        {isActive && (
                          <Badge className="shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('wallets.active_wallet', 'Active')}
                          </Badge>
                        )}
                      </div>

                      <div className="mb-2">
                        <WalletTypeBadge type={wallet.type} />
                      </div>

                      <div className="text-xs text-muted-foreground font-mono">
                        {formatAddress(wallet.publicKey)}
                      </div>

                      {wallet.accountIndex !== undefined && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t('wallets.account', 'Account')} #
                          {wallet.accountIndex}
                        </div>
                      )}
                    </button>

                    <div className="shrink-0 flex items-center gap-2">
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isSwitching || isDeleting}
                          onClick={() => setDeleteWalletId(wallet.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="shrink-0">
                        {isSwitching ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : isActive ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </BottomSheetBody>

        <AlertDialog
          open={!!deleteWalletId}
          onOpenChange={(open) => {
            if (!open && !isDeleting) {
              setDeleteWalletId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('wallets.delete_wallet', 'Delete Wallet')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  'wallets.delete_wallet_desc',
                  'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
                  {
                    name:
                      wallets.find((wallet) => wallet.id === deleteWalletId)?.name ||
                      t('wallets.wallet_name', 'Wallet'),
                  },
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t('common.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  handleDeleteWallet();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('wallets.delete_wallet', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t space-y-3">
          <Button
            className="w-full"
            onClick={() => setIsAddWalletOpen(true)}
            disabled={isDeleting || isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('wallets.add_wallet', 'Add Wallet')}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')}
            />
            {t('common.refresh', 'Refresh')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('wallets.total_wallets', '{{count}} wallet(s) in total', {
              count: wallets.length,
            })}
          </p>
        </div>
      </BottomSheetContent>

      <AddWalletDialog
        open={isAddWalletOpen}
        onOpenChange={(open) => {
          setIsAddWalletOpen(open);
          if (!open) {
            handleRefresh();
          }
        }}
      />
    </BottomSheet>
  );
}
