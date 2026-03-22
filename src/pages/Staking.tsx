import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/dashboard/dashboard-header';
import { useStaking } from '@/hooks/use-staking';
import { ValidatorList } from '@/components/wallet/validator-list';
import { StakingInfoCard } from '@/components/wallet/staking-info-card';
import { ValidatorDetailsSheet } from '@/components/wallet/validator-details-sheet';
import { ConfirmDelegationSheet } from '@/pages/ConfirmDelegation';
import { CustomDelegateSheet } from '@/components/staking/custom-delegate-sheet';
import { LedgerResultDialog } from '@/components/staking/ledger-result-dialog';
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
    signedResult,
    customSheetOpen,
    delegating,
    setSelectedValidator,
    setConfirmOpen,
    handleCardClick,
    handleStartDelegating,
    handleConfirmDelegation,
    handleCustomClick,
    handleCustomConfirm,
    setCustomSheetOpen,
    setSignedResult,
    refetch,
    displayLoading,
  } = useStaking();

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

      <CustomDelegateSheet
        open={customSheetOpen}
        onOpenChange={setCustomSheetOpen}
        onConfirm={handleCustomConfirm}
      />

      <LedgerResultDialog
        open={!!signedResult}
        onOpenChange={() => setSignedResult(null)}
        result={signedResult}
      />
    </div>
  );
};

export default StakingPage;
