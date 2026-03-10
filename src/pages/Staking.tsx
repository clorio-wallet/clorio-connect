import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/dashboard/dashboard-header';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { ValidatorList } from '@/components/wallet/validator-list';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCcw } from 'lucide-react';
import { useGetValidators, Validator } from '@/api/mina/validators';
import { StakingInfoCard } from '@/components/wallet/staking-info-card';
import { ValidatorDetailsSheet } from '@/components/wallet/validator-details-sheet';
import { useGetAccount } from '@/api/mina/mina';
import { ConfirmDelegationSheet } from '@/pages/ConfirmDelegation';
import {
  useDelegateTransaction,
  type SignedLedgerDelegationResult,
} from '@/hooks/use-delegate-transaction';
import { useToast } from '@/hooks/use-toast';
import { LedgerError } from '@/lib/ledger';

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
    staleTime: 600000,
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
  const [signedResult, setSignedResult] =
    React.useState<SignedLedgerDelegationResult | null>(null);

  const handleCardClick = (validator: Validator) => {
    setSelectedValidator(validator);
  };

  const handleStartDelegating = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelegation = async (password: string) => {
    if (!selectedValidator) return;
    try {
      const result = await delegateTransaction(selectedValidator.publicKey, password);
      setConfirmOpen(false);
      setSelectedValidator(null);

      if (result.kind === 'signed') {
        setSignedResult(result);
      }
    } catch (error) {
      console.error('Delegation failed:', error);
      if (!(error instanceof LedgerError)) {
        toast({
          title: t('common.error', 'Error'),
          description: t('validators.delegation_failed', 'Failed to delegate'),
          variant: 'destructive',
        });
      }
      throw error;
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

      <Dialog
        open={!!signedResult}
        onOpenChange={(open) => {
          if (!open) setSignedResult(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ledger signed delegation</DialogTitle>
            <DialogDescription>
              Firma reale acquisita dal dispositivo. Nessun broadcast e stato eseguito.
            </DialogDescription>
          </DialogHeader>

          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
            {signedResult
              ? JSON.stringify(
                  {
                    signature: signedResult.signature,
                    payload: signedResult.payload,
                  },
                  null,
                  2,
                )
              : ''}
          </pre>

          <DialogFooter>
            <Button onClick={() => setSignedResult(null)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StakingPage;
