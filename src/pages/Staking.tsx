import React from 'react';
import { useTranslation } from 'react-i18next';
import { ValidatorList } from '@/components/wallet/validator-list';
import { useGetValidators } from '@/api/mina/validators';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

import { StakingInfoCard } from '@/components/wallet/staking-info-card';

const StakingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useSessionStore();
  const { toast } = useToast();
  
  const {
    account,
    network,
    healthData,
    minaInfo,
    displayLoading,
    refetchAccount,
  } = useDashboardData();

  const { data: validators, isLoading: isLoadingValidators } = useGetValidators(account?.delegate || undefined);

  const currentValidator = React.useMemo(() => {
    return validators?.find(v => v.address === account?.delegate);
  }, [validators, account?.delegate]);

  const handleLogout = () => {
    logout();
    toast({
      title: t('dashboard.logout_title'),
      description: t('dashboard.logout_desc'),
    });
    navigate('/wallet-unlock');
  };

  const handleDelegate = (validator: any) => {
    // TODO: Implement delegation logic
    toast({
      title: 'Not Implemented',
      description: `Delegation to ${validator.name || validator.address} coming soon.`,
    });
  };

  return (
    <div className="space-y-6 py-2 h-full flex flex-col">
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

      <div className="flex-1 min-h-0">
        <div className="mb-4 px-1 space-y-4">
          <div>
            <h2 className="text-2xl font-display text-white">
              {t('staking.title', 'Staking')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t('staking.subtitle', 'Select a validator to delegate your stake.')}
            </p>
          </div>

          <StakingInfoCard
            delegateName={currentValidator?.name}
            delegateAddress={account?.delegate || undefined}
            stake={Number(account?.balanceRaw || 0)}
            epoch={minaInfo?.epoch || 0}
            slot={minaInfo?.slot || 0}
            remainingTime={minaInfo?.remainingTime || { days: 0, hours: 0, minutes: 0 }}
            isLoading={displayLoading}
          />
        </div>

        <ValidatorList
          validators={validators || []}
          isLoading={isLoadingValidators}
          onDelegate={handleDelegate}
          className="h-[500px]"
        />
      </div>
    </div>
  );
};

export default StakingPage;
