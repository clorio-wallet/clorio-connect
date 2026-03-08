import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Lock, RefreshCcw, SquareArrowOutUpRight, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkBadge } from '@/components/wallet';


import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';

export const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useSessionStore();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const { network, healthData, minaInfo, displayLoading, refetchAccount } =
    useDashboardData();

  const handleRefresh = () => {
    if (!isOnline) {
      toast({
        title: t('common.offline', 'Offline'),
        description: t('common.offline_desc', 'You are currently offline. Please check your internet connection.'),
        variant: 'destructive',
      });
      return;
    }
    refetchAccount();
  };

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
    <header className="flex justify-between items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <NetworkBadge network={network.name} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              {!isOnline ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <WifiOff className="h-3 w-3" />
                    <span>{t('dashboard.offline_mode', 'Offline Mode')}</span>
                  </div>
                  <p className="text-muted-foreground max-w-[200px]">
                    {t(
                      'dashboard.offline_data_desc',
                      'Showing data from last connection',
                    )}
                  </p>
                  <div className="pt-1 border-t border-border/50 space-y-1 opacity-70">
                    <p>
                      {t('dashboard.block_height')}: {minaInfo?.height ?? '-'}
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
      <div className="flex gap-2">
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
          onClick={handleLogout}
          title={t('dashboard.logout')}
        >
          <Lock className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
