import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/dashboard/dashboard-header';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { ValidatorList } from '@/components/wallet/validator-list';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useGetValidators, Validator } from '@/api/mina/validators';
import { StakingInfoCard } from '@/components/wallet/staking-info-card';
import { ValidatorDetailsSheet } from '@/components/wallet/validator-details-sheet';
import { useGetAccount } from '@/api/mina/mina';
import { ConfirmDelegationSheet } from '@/pages/ConfirmDelegation';
import { useDelegateTransaction } from '@/hooks/use-delegate-transaction';
import { useToast } from '@/hooks/use-toast';

const StakingPage: React.FC = () => {
  const { t } = useTranslation();
  const { delegateTransaction, loading: delegating } = useDelegateTransaction();
  const { toast } = useToast();

  const { publicKey, displayLoading, refetchAccount } = useDashboardData();

  const {
    data: validators,
    isLoading: isLoadingValidators,
    isFetching: isFetchingValidators,
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
      isDelegated: v.publicKey === accountData?.delegate,
    }));
  }, [validators, accountData?.delegate]);

  const handleRefresh = () => {
    refetchAccount();
    refetchValidators();
  };

  const [selectedValidator, setSelectedValidator] =
    React.useState<Validator | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleCardClick = (validator: Validator) => {
    setSelectedValidator(validator);
  };

  const handleStartDelegating = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelegation = async (password: string) => {
    if (!selectedValidator) return;
    try {
      await delegateTransaction(selectedValidator.publicKey, password);
      setConfirmOpen(false);
      setSelectedValidator(null);
    } catch (error) {
      console.error('Delegation failed:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('validators.delegation_failed', 'Failed to delegate'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 py-2">
      <AppHeader />

      <div className="space-y-4">
        <StakingInfoCard
          isLoadingOverride={displayLoading || isLoadingValidators}
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
              disabled={isFetchingValidators || displayLoading}
            >
              <RefreshCcw
                className={`h-5 w-5 ${isFetchingValidators ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        <div>
          <ValidatorList
            validators={validatorsWithDelegation}
            isLoading={isLoadingValidators}
            onDelegate={handleCardClick}
          />
        </div>
      </div>

      <ValidatorDetailsSheet
        open={!!selectedValidator && !confirmOpen}
        onOpenChange={(o) => {
          if (!o) setSelectedValidator(null);
        }}
        validator={selectedValidator}
        isDelegated={
          !!selectedValidator &&
          selectedValidator.publicKey === accountData?.delegate
        }
        onDelegate={handleStartDelegating}
      />

      <ConfirmDelegationSheet
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setSelectedValidator(null);
        }}
        validator={selectedValidator}
        onConfirm={handleConfirmDelegation}
        loading={delegating}
      />
    </div>
  );
};

export default StakingPage;
