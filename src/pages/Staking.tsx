import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/dashboard/dashboard-header';
import { useStaking } from '@/hooks/use-staking';
import { ValidatorList } from '@/components/wallet/validator-list';
import { StakingInfoCard } from '@/components/wallet/staking-info-card';
import { ValidatorDetailsSheet } from '@/components/wallet/validator-details-sheet';
import { ConfirmDelegationSheet } from '@/pages/ConfirmDelegation';
import { CustomDelegateSheet } from '@/components/staking/custom-delegate-sheet';
import { DelegationResultSheet } from '@/components/staking/delegation-result-sheet';
import { Button } from '@/components/ui/button';
import { RefreshCcw, PencilLine } from 'lucide-react';

const StakingPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    validators,
    isLoadingValidators,
    isFetchingValidators,
    accountData,
    selectedValidator,
    confirmOpen,
    resultOpen,
    resultHash,
    resultError,
    customSheetOpen,
    delegating,
    setSelectedValidator,
    setConfirmOpen,
    setResultOpen,
    handleCardClick,
    handleStartDelegating,
    handleConfirmDelegation,
    handleCustomClick,
    handleCustomConfirm,
    setCustomSheetOpen,
    handleRetryDelegation,
    refetch,
    displayLoading,
  } = useStaking();

  const getResultStatus = () => {
    if (delegating) return 'broadcasting';
    if (resultHash) return 'success';
    if (resultError) return 'failed';
    return 'broadcasting';
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomClick}
                className="gap-2"
              >
                <PencilLine className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t('staking.custom_delegate_button', 'Custom address')}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={refetch}
                disabled={isFetchingValidators || displayLoading}
              >
                <RefreshCcw
                  className={`h-5 w-5 ${isFetchingValidators ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </div>

        <ValidatorList
          validators={validators}
          isLoading={isLoadingValidators}
          onDelegate={handleCardClick}
        />
      </div>

      <ValidatorDetailsSheet
        open={!!selectedValidator && !confirmOpen && !resultOpen}
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
          if (!o && !resultOpen) setSelectedValidator(null);
        }}
        validator={selectedValidator}
        onConfirm={handleConfirmDelegation}
        loading={delegating}
      />

      <CustomDelegateSheet
        open={customSheetOpen}
        onOpenChange={setCustomSheetOpen}
        onConfirm={handleCustomConfirm}
      />

      <DelegationResultSheet
        open={resultOpen}
        onOpenChange={(open) => {
          setResultOpen(open);
          if (!open) {
            setSelectedValidator(null);
          }
        }}
        status={getResultStatus()}
        validatorName={selectedValidator?.name || null}
        validatorAddress={selectedValidator?.publicKey || null}
        hash={resultHash}
        error={resultError}
        onRetry={handleRetryDelegation}
      />
    </div>
  );
};

export default StakingPage;
