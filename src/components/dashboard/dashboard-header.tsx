import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Lock, BookPlus, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkBadge } from '@/components/wallet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DashboardHeaderProps {
  networkName: string;
  healthStatus?: string;
  blockHeight?: number | string;
  epoch?: number | string;
  slot?: number | string;
  displayLoading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  networkName,
  healthStatus,
  blockHeight,
  epoch,
  slot,
  displayLoading,
  onRefresh,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="flex justify-between items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <NetworkBadge network={networkName} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>
                {t('dashboard.status')}:{' '}
                <span
                  className={
                    healthStatus === 'ok' ? 'text-green-500' : 'text-red-500'
                  }
                >
                  {healthStatus || t('dashboard.checking')}
                </span>
              </p>
              <p>{t('dashboard.block_height')}: {blockHeight || '-'}</p>
              <p>{t('dashboard.epoch')}: {epoch || '-'}</p>
              <p>{t('dashboard.slot')}: {slot || '-'}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
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
          onClick={onLogout}
          title={t('dashboard.logout')}
        >
          <Lock className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
