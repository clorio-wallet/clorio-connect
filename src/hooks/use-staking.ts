import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';

import { useGetAccount } from '@/api/mina/mina';
import type { GetAccount } from '@/api/model/getAccount';
import { useDelegateTransaction } from '@/hooks/use-delegate-transaction';
import { LedgerError } from '@/lib/ledger';
import { useGetValidators, type Validator } from '@/api/mina/validators';
import type { ValidatorDetails } from '@/components/wallet/validator-details-sheet';

interface UseStakingReturn {
  validators: Validator[];
  isLoadingValidators: boolean;
  isFetchingValidators: boolean;
  accountData: GetAccount | undefined;
  selectedValidator: ValidatorDetails | null;
  confirmOpen: boolean;
  resultOpen: boolean;
  resultHash: string | null;
  resultError: string | null;
  customSheetOpen: boolean;
  delegating: boolean;
  setSelectedValidator: (v: ValidatorDetails | null) => void;
  setConfirmOpen: (open: boolean) => void;
  setResultOpen: (open: boolean) => void;
  handleCardClick: (validator: Validator) => void;
  handleStartDelegating: () => void;
  handleConfirmDelegation: (password: string) => Promise<void>;
  handleCustomClick: () => void;
  handleCustomConfirm: (address: string) => void;
  setCustomSheetOpen: (open: boolean) => void;
  handleRetryDelegation: () => void;
  refetch: () => void;
  displayLoading: boolean;
}

export function useStaking(): UseStakingReturn {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { delegateTransaction, loading: delegating } = useDelegateTransaction();
  const { publicKey, displayLoading, refetchAccount } = useDashboardData();

  const {
    data: validators,
    isLoading: isLoadingValidators,
    isFetching: isFetchingValidators,
    refetch: refetchValidators,
  } = useGetValidators({ staleTime: 600000 });

  const { data: accountData } = useGetAccount(publicKey || '', {
    query: { enabled: !!publicKey },
  });

  const [selectedValidator, setSelectedValidator] =
    useState<ValidatorDetails | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultHash, setResultHash] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [customSheetOpen, setCustomSheetOpen] = useState(false);

  const validatorsWithDelegation = useMemo(() => {
    if (!validators) return [];
    return validators.map((v) => ({
      ...v,
      isDelegated: v.publicKey === accountData?.delegate,
    }));
  }, [validators, accountData?.delegate]);

  const handleCardClick = useCallback((validator: Validator) => {
    setSelectedValidator(validator);
  }, []);

  const handleStartDelegating = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleCustomClick = useCallback(() => {
    setCustomSheetOpen(true);
  }, []);

  const handleCustomConfirm = useCallback(
    (address: string) => {
      setSelectedValidator({
        publicKey: address,
        name: t('staking.custom_address_label', 'Custom address'),
        stake: 0,
        fee: 0,
        isCustomAddress: true,
      });
      setCustomSheetOpen(false);
      setConfirmOpen(true);
    },
    [t],
  );

  const handleConfirmDelegation = useCallback(
    async (password: string) => {
      if (!selectedValidator) return;
      try {
        setResultHash(null);
        setResultError(null);

        const result = await delegateTransaction(
          selectedValidator.publicKey,
          password,
        );

        setConfirmOpen(false);
        setResultOpen(true);
        setResultHash(result.hash);
      } catch (error) {
        console.error('Delegation failed:', error);
        setConfirmOpen(false);
        setResultOpen(true);
        setResultError(
          error instanceof Error
            ? error.message
            : t('validators.delegation_failed', 'Failed to delegate'),
        );
        if (!(error instanceof LedgerError)) {
          toast({
            title: t('common.error', 'Error'),
            description: t(
              'validators.delegation_failed',
              'Failed to delegate',
            ),
            variant: 'destructive',
          });
        }
        throw error;
      }
    },
    [selectedValidator, delegateTransaction, toast, t],
  );

  const handleRetryDelegation = useCallback(async () => {
    if (!selectedValidator) return;
    setResultHash(null);
    setResultError(null);
    setConfirmOpen(true);
    setResultOpen(false);
  }, [selectedValidator]);

  const refetch = useCallback(() => {
    refetchAccount();
    refetchValidators();
  }, [refetchAccount, refetchValidators]);

  return {
    validators: validatorsWithDelegation,
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
  };
}
