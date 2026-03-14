import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Lock,
  SquareArrowOutUpRight,
  WifiOff,
  Wallet,
  MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkBadge } from '@/components/wallet';
import { WalletSwitcher } from '@/components/wallet/wallet-switcher';
import { useWalletStore } from '@/stores/wallet-store';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSidePanelMode } from '@/hooks/use-side-panel-mode';

export const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useSessionStore();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const { accountName, wallets } = useWalletStore();
  const { isPopup } = useSidePanelMode();
  const [isWalletSwitcherOpen, setIsWalletSwitcherOpen] = useState(false);

  const { network, healthData, minaInfo } = useDashboardData();

  const showWalletSwitcher = wallets.length > 1;

  const handleOpenWindow = async () => {
    try {
      const url = chrome?.runtime?.getURL('src/popup/index.html');
      if (chrome?.windows?.create && url) {
        await chrome.windows.create({
          url,
          type: 'popup',
          width: 420,
          height: 720,
        });
      } else if (url) {
        window.open(
          url,
          '_blank',
          'popup=yes,width=420,height=720,noopener,noreferrer',
        );
      }
    } catch (error) {
      console.error('Failed to open popout window:', error);
      try {
        const fallbackUrl = chrome?.runtime?.getURL('src/popup/index.html');
        if (fallbackUrl) {
          window.open(
            fallbackUrl,
            '_blank',
            'popup=yes,width=420,height=720,noopener,noreferrer',
          );
        }
      } catch {
        // ignore
      }
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: t('dashboard.logout_title'),
      description: t('dashboard.logout_desc'),
    });
    // /wallet-unlock handles both Ledger and software wallet lock screens.
    navigate('/wallet-unlock');
  };

  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <NetworkBadge network={network.name} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  {!isOnline ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 font-medium text-destructive">
                        <WifiOff className="h-3 w-3" />
                        <span>
                          {t('dashboard.offline_mode', 'Offline Mode')}
                        </span>
                      </div>
                      <p className="max-w-[200px] text-muted-foreground">
                        {t(
                          'dashboard.offline_data_desc',
                          'Showing data from last connection',
                        )}
                      </p>
                      <div className="space-y-1 border-t border-border/50 pt-1 opacity-70">
                        <p>
                          {t('dashboard.block_height')}:{' '}
                          {minaInfo?.height ?? '-'}
                        </p>
                        <p>
                          {t('dashboard.epoch')}: {minaInfo?.epoch ?? '-'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>
                        {t('dashboard.status')}:{' '}
                        <span
                          className={
                            healthData?.status === 'ok'
                              ? 'text-green-500'
                              : 'text-red-500'
                          }
                        >
                          {healthData?.status || t('dashboard.checking')}
                        </span>
                      </p>
                      <p>
                        {t('dashboard.block_height')}: {minaInfo?.height ?? '-'}
                      </p>
                      <p>
                        {t('dashboard.epoch')}: {minaInfo?.epoch ?? '-'}
                      </p>
                      <p>
                        {t('dashboard.slot')}: {minaInfo?.slot ?? '-'}
                      </p>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsWalletSwitcherOpen(true)}
            className="min-w-0 max-w-fit flex-1 justify-start gap-2 overflow-hidden px-2 sm:flex-none sm:px-3 border border-transparent hover:bg-transparent hover:border-white/40 "
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm">{accountName || 'Wallet'}</span>
          </Button>
        </div>

        {isPopup ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                title={t('common.actions', 'Actions')}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={handleOpenWindow}>
                <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                {t('dashboard.open_window', 'Open in new window')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <Lock className="mr-2 h-4 w-4" />
                {t('dashboard.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenWindow}
              title={t('dashboard.open_window', 'Open in new window')}
            >
              <SquareArrowOutUpRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title={t('dashboard.logout')}
            >
              <Lock className="h-5 w-5" />
            </Button>
          </div>
        )}
      </header>

      <WalletSwitcher
        open={isWalletSwitcherOpen}
        onOpenChange={setIsWalletSwitcherOpen}
      />
    </>
  );
};
