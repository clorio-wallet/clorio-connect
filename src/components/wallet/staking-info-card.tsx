import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { formatBalance, formatAddress } from '@/lib/utils';

interface StakingInfoCardProps {
  delegateName?: string;
  delegateAddress?: string;
  stake: number | string;
  epoch: number;
  slot: number;
  remainingTime: {
    days: number;
    hours: number;
    minutes: number;
  };
  isLoading?: boolean;
}

const SLOTS_PER_EPOCH = 7140;

export const StakingInfoCard: React.FC<StakingInfoCardProps> = ({
  delegateName,
  delegateAddress,
  stake,
  epoch,
  slot,
  remainingTime,
  isLoading,
}) => {
  const { t } = useTranslation();

  const progress = Math.min(100, Math.max(0, (slot / SLOTS_PER_EPOCH) * 100));

  const timeLeftString = React.useMemo(() => {
    if (remainingTime.days > 0) {
      return t('time.days_hours_left', { days: remainingTime.days, hours: remainingTime.hours });
    }
    if (remainingTime.hours > 0) {
      return t('time.hours_minutes_left', { hours: remainingTime.hours, minutes: remainingTime.minutes });
    }
    return t('time.minutes_left', { minutes: remainingTime.minutes });
  }, [remainingTime, t]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-card text-card-foreground border-none shadow-md">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-muted rounded"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
          <div className="h-12 w-full bg-muted rounded mt-4"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-[#0B0F19] text-white border-border/10 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight">
            {delegateName ||
              (delegateAddress
                ? formatAddress(delegateAddress)
                : t('staking.no_delegate'))}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('staking.your_stake')}:{' '}
            <span className="text-white font-medium">
              {formatBalance(stake)} MINA
            </span>
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-light">{t('staking.epoch')}</span>
              <span className="text-2xl font-bold">{epoch}</span>
            </div>
            <span className="text-xl font-light tracking-wide">
              {timeLeftString}
            </span>
          </div>

          <Progress
            value={progress}
            className="h-2 bg-muted/20"
            indicatorClassName="bg-green-500"
          />
        </div>
      </div>
    </Card>
  );
};
