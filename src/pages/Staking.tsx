import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ValidatorList } from '@/components/wallet/validator-list';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useGetValidators } from '@/api/mina/validators';
import { StakingInfoCard } from '@/components/wallet/staking-info-card';
import { useGetAccount } from '@/api/mina/mina';

const StakingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useSessionStore();
  const { toast } = useToast();

  const {
    publicKey,
    network,
    healthData,
    minaInfo,
    displayLoading,
    refetchAccount,
    account
  } = useDashboardData();

  const {
    data: validators,
    isLoading: isLoadingValidators,
    refetch: refetchValidators,
  } = useGetValidators({
    staleTime: 600000, // 10 minutes
  });

  const { data: accountData } = useGetAccount(publicKey || '', {
    query: {
      enabled: !!publicKey,
    },
  });

  const validatorsWithDelegation = React.useMemo(() => {
    if (!validators) return [];
    return validators.map((v) => ({
      ...v,
      isDelegated: v.address === accountData?.delegate,
    }));
  }, [validators, accountData?.delegate]);

  const currentDelegate = React.useMemo(() => {
    if (!accountData?.delegate || !validators) return null;
    return validators.find(v => v.address === accountData.delegate) || {
        address: accountData.delegate,
        name: undefined,
        stake: 0,
        fee: 0,
        isDelegated: true
    };
  }, [accountData, validators]);

  const handleLogout = () => {
    logout();
    toast({
      title: t('dashboard.logout_title'),
      description: t('dashboard.logout_desc'),
    });
    navigate('/wallet-unlock');
  };

  const handleRefresh = () => {
    refetchAccount();
    refetchValidators();
  };

  const remainingTime = minaInfo?.remainingTime || { days: 0, hours: 0, minutes: 0 };

  return (
    <div className="space-y-6 py-2">
      <DashboardHeader
        networkName={network.name}
        healthStatus={healthData?.status}
        blockHeight={minaInfo?.height}
        epoch={minaInfo?.epoch}
        slot={minaInfo?.slot}
        displayLoading={displayLoading}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />

      <div className="space-y-4">
        <StakingInfoCard 
            delegateName={currentDelegate?.name}
            delegateAddress={currentDelegate?.address}
            stake={accountData?.balance || '0'}
            epoch={minaInfo?.epoch || 0}
            slot={minaInfo?.slot || 0}
            remainingTime={remainingTime}
            isLoading={displayLoading || isLoadingValidators}
        />

        <div className="flex flex-row items-center gap-2">
          <div className="flex flex-row justify-between items-center w-full">
            <h2 className="text-2xl font-display text-white">
              {t('staking.title', 'Staking')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoadingValidators || displayLoading}
            >
              <RefreshCcw
                className={`h-5 w-5 ${isLoadingValidators ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        <div>
             <ValidatorList 
                validators={validatorsWithDelegation}
                isLoading={isLoadingValidators}
                onDelegate={(validator) => {
                    console.log('Delegate to:', validator);
                    // TODO: Open delegate modal
                }}
             />
        </div>
      </div>
    </div>
  );
};

export default StakingPage;
