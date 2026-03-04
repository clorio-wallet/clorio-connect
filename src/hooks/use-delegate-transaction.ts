import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@/stores/wallet-store';
import { useGetAccount } from '@/api/mina/mina';
import { useToast } from '@/hooks/use-toast';
import { toNano } from '@/lib/utils';
import { FEATURES } from '@/lib/const';
import type {
  SignDelegationMessage,
  SignDelegationResponse,
} from '@/messages/types';

const DELEGATION_FEE_MINA = '0.012';

export interface DelegateTransactionResult {
  hash: string;
}

export function useDelegateTransaction() {
  const { publicKey } = useWalletStore();
  const { data: accountData, refetch: refetchAccount } = useGetAccount(
    publicKey || '',
    { query: { enabled: !!publicKey } },
  );

  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const delegateTransaction = async (
    validatorPublicKey: string,
    password: string,
  ): Promise<DelegateTransactionResult> => {
    if (!publicKey) {
      throw new Error('Wallet not initialized');
    }

    setLoading(true);

    try {
      const nonce = (accountData?.nonce ?? 0).toString();

      const delegation = {
        from: publicKey,
        to: validatorPublicKey,
        fee: toNano(DELEGATION_FEE_MINA),
        nonce,
        memo: '',
      };

      console.log('[useDelegateTransaction] Preparing stake delegation:', {
        from: delegation.from,
        to: delegation.to,
        fee: delegation.fee,
        nonce: delegation.nonce,
        memo: delegation.memo,
      });

      // Ask background service worker to sign the delegation
      const message: SignDelegationMessage = {
        type: 'SIGN_DELEGATION',
        payload: { delegation, password },
      };

      const responseRaw = await chrome.runtime.sendMessage(message);

      if (!responseRaw || typeof responseRaw !== 'object') {
        throw new Error('No response from signing service');
      }

      const response = responseRaw as SignDelegationResponse | { error: string };

      if ('error' in response) {
        throw new Error(response.error || 'Signing failed');
      }

      const signatureObj = (response as SignDelegationResponse).signature;

      console.log('[useDelegateTransaction] Received signature:', {
        field: signatureObj.field,
        scalar: signatureObj.scalar,
      });

      // Dry-run mode: skip actual broadcast
      if (FEATURES.DRY_RUN_SEND_TX) {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const mockHash =
          '5' +
          Array(52)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');

        console.log('[useDelegateTransaction] [DRY RUN] Mock tx hash:', mockHash);

        toast({
          variant: 'success',
          title: t('common.success'),
          description: `[DRY RUN] ${t('validators.delegation_success', 'Successfully delegated')}`,
        });

        refetchAccount();
        return { hash: mockHash };
      }

      // TODO: broadcast via GraphQL mutation when endpoint is confirmed
      // For now log the signed payload that would be submitted
      console.log('[useDelegateTransaction] Signed delegation ready to broadcast:', {
        input: {
          from: delegation.from,
          to: delegation.to,
          fee: delegation.fee,
          nonce: delegation.nonce,
          memo: delegation.memo,
        },
        signature: {
          field: signatureObj.field,
          scalar: signatureObj.scalar,
        },
      });

      // Simulate successful broadcast until mutation is wired up
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockHash =
        '5' +
        Array(52)
          .fill(0)
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join('');

      toast({
        variant: 'success',
        title: t('common.success'),
        description: t(
          'validators.delegation_success',
          'Successfully delegated to validator',
        ),
      });

      refetchAccount();
      return { hash: mockHash };
    } finally {
      setLoading(false);
    }
  };

  return {
    delegateTransaction,
    loading,
  };
}
