import React, { useState, useEffect } from 'react';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Key,
  ChevronRight,
} from 'lucide-react';
import type { WalletEntry } from '@/lib/types/vault';
import { useWalletStore } from '@/stores/wallet-store';

import { cn, formatAddress } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface WalletSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Keep spacing tokens aligned with the other wallet sheets so the component
// keeps the same visual rhythm as account management surfaces.
const SHEET_CONTENT_CLASS = 'max-h-[85vh]';
const LIST_CLASS = 'space-y-3';
const CARD_BASE_CLASS = 'w-full rounded-lg border p-4 text-left transition-all';
const CARD_IDLE_CLASS =
  'border-border bg-background hover:border-primary/50 hover:bg-accent/50';
const CARD_ACTIVE_CLASS = 'border-primary bg-primary/5';
const CARD_DISABLED_CLASS = 'cursor-not-allowed opacity-50';
const CARD_META_CLASS = 'truncate font-mono text-sm text-muted-foreground';
const CARD_SUBTEXT_CLASS = 'text-xs text-muted-foreground';

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

export const WalletSwitcher: React.FC<WalletSwitcherProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeWalletId, setActiveWallet, wallets, loadWallets } =
    useWalletStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingWalletId, setSwitchingWalletId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (open && wallets.length === 0) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadWallets();
    } catch (error) {
      console.error('Failed to load wallets:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.load_failed', 'Failed to load wallets'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchWallet = async (walletId: string) => {
    if (walletId === activeWalletId) {
      onOpenChange(false);
      return;
    }

    setIsSwitching(true);
    setSwitchingWalletId(walletId);

    try {
      await setActiveWallet(walletId);

      const wallet = wallets.find((w) => w.id === walletId);
      toast({
        title: t('wallets.switch_success', 'Wallet switched'),
        description: t(
          'wallets.switch_success_desc',
          `Now using "${wallet?.name}"`,
          { name: wallet?.name },
        ),
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to switch wallet:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.switch_failed', 'Failed to switch wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSwitching(false);
      setSwitchingWalletId(null);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className={SHEET_CONTENT_CLASS}>
        <BottomSheetHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <BottomSheetTitle>
                {t('wallets.switch_wallet', 'Switch Wallet')}
              </BottomSheetTitle>
              <BottomSheetDescription>
                {t(
                  'wallets.switch_wallet_desc',
                  'Select a wallet to make it active',
                )}
              </BottomSheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="py-2">
          <div className={LIST_CLASS}>
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-lg border border-border p-4"
                  >
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </>
            ) : wallets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>{t('wallets.no_wallets', 'No wallets found')}</p>
              </div>
            ) : (
              wallets.map((wallet) => {
                const isActive = wallet.id === activeWalletId;
                const isSwitchingThis = switchingWalletId === wallet.id;

                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleSwitchWallet(wallet.id)}
                    disabled={isSwitching}
                    className={cn(
                      CARD_BASE_CLASS,
                      isActive ? CARD_ACTIVE_CLASS : CARD_IDLE_CLASS,
                      isSwitching && CARD_DISABLED_CLASS,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <WalletTypeIcon type={wallet.type} />
                          <span className="truncate font-medium">
                            {wallet.name}
                          </span>
                          {isActive && (
                            <Badge variant="default" className="shrink-0 gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('wallets.active', 'Active')}
                            </Badge>
                          )}
                        </div>

                        <p className={CARD_META_CLASS}>
                          {formatAddress(wallet.publicKey)}
                        </p>

                        {wallet.accountIndex !== undefined && (
                          <p className={CARD_SUBTEXT_CLASS}>
                            {t('wallets.account', 'Account')} #{wallet.accountIndex}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center pt-0.5">
                        {isSwitchingThis ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isActive ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </BottomSheetBody>

        {wallets.length > 0 && (
          <div className="border-t px-4 py-4">
            <p className="text-center text-xs text-muted-foreground">
              {t('wallets.total_wallets', '{{count}} wallet(s) in total', {
                count: wallets.length,
              })}
            </p>
          </div>
        )}
      </BottomSheetContent>
    </BottomSheet>
  );
};

export default WalletSwitcher;
