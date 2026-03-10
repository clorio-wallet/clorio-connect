import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@/stores/wallet-store';
import { useGetAccount } from '@/api/mina/mina';
import { broadcastDelegation } from '@/api/mina/transactions';
import { useToast } from '@/hooks/use-toast';
import { toNano } from '@/lib/utils';
import { FEATURES } from '@/lib/const';
import { useSettingsStore } from '@/stores/settings-store';
import {
  NetworkId,
  checkLedgerStatus,
  signLedgerDelegation,
  LedgerStatus,
  LedgerError,
  type SignedPayload,
} from '@/lib/ledger';
import type {
  SignDelegationMessage,
  SignDelegationResponse,
} from '@/messages/types';

const DELEGATION_FEE_MINA = '0.012';

function toLedgerNetworkId(
  networkLabel: string,
): (typeof NetworkId)[keyof typeof NetworkId] {
  return networkLabel === 'mainnet' ? NetworkId.MAINNET : NetworkId.DEVNET;
}

export interface BroadcastDelegationResult {
  kind: 'broadcast';
  hash: string;
}

export interface SignedLedgerDelegationResult {
  kind: 'signed';
  signature: string;
  payload: SignedPayload;
}

export type DelegateTransactionResult =
  | BroadcastDelegationResult
  | SignedLedgerDelegationResult;

export function useDelegateTransaction() {
  const { publicKey, accountType, ledgerAccountIndex } = useWalletStore();
  const { data: accountData, refetch: refetchAccount } = useGetAccount(
    publicKey || '',
    { query: { enabled: !!publicKey } },
  );
  const { networkId } = useSettingsStore();

  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const delegateWithLedger = async (
    validatorPublicKey: string,
  ): Promise<SignedLedgerDelegationResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

    const index = ledgerAccountIndex ?? 0;
    const nonce = accountData?.nonce ?? 0;

    const { status, app } = await checkLedgerStatus();
    if (status !== LedgerStatus.READY || !app) {
      if (status === LedgerStatus.APP_NOT_OPEN) {
        throw LedgerError.appNotOpen(t('ledger.errors.app_not_open'));
      }
      throw LedgerError.disconnected(t('ledger.errors.disconnected'));
    }

    const result = await signLedgerDelegation(
      app,
      {
        fromAddress: publicKey,
        toAddress: validatorPublicKey,
        fee: DELEGATION_FEE_MINA,
        nonce,
        memo: '',
        networkId: toLedgerNetworkId(networkId),
      },
      index,
    );

    if (result.rejected) {
      throw LedgerError.rejected(
        t('ledger.errors.user_rejected', 'Operation rejected on device'),
      );
    }

    if (!result.signature || !result.payload) {
      throw LedgerError.signFailed(
        result.error ?? t('ledger.errors.sign_failed', 'Signing failed'),
      );
    }

    return {
      kind: 'signed',
      signature: result.signature,
      payload: result.payload,
    };
  };

  const delegateWithSoftware = async (
    validatorPublicKey: string,
    password: string,
  ): Promise<BroadcastDelegationResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

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
      throw new Error(
        (response as { error: string }).error || 'Signing failed',
      );
    }

    const signatureObj = (response as SignDelegationResponse).signature;

    console.log('[useDelegateTransaction] Received signature:', {
      field: signatureObj.field,
      scalar: signatureObj.scalar,
    });

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
      return { kind: 'broadcast', hash: mockHash };
    }

    const result = await broadcastDelegation(
      {
        from: delegation.from,
        to: delegation.to,
        fee: delegation.fee,
        nonce: delegation.nonce,
        memo: delegation.memo,
      },
      {
        field: signatureObj.field,
        scalar: signatureObj.scalar,
      },
    );

    if (!result?.hash) {
      throw new Error(t('send.broadcast_error', 'Broadcast failed'));
    }

    toast({
      variant: 'success',
      title: t('common.success'),
      description: t(
        'validators.delegation_success',
        'Successfully delegated to validator',
      ),
    });

    refetchAccount();
    return { kind: 'broadcast', hash: result.hash };
  };

  const delegateTransaction = async (
    validatorPublicKey: string,
    password: string,
  ): Promise<DelegateTransactionResult> => {
    setLoading(true);
    try {
      if (accountType === 'ledger') {
        return await delegateWithLedger(validatorPublicKey);
      }
      return await delegateWithSoftware(validatorPublicKey, password);
    } finally {
      setLoading(false);
    }
  };

  return {
    delegateTransaction,
    loading,
    isLedger: accountType === 'ledger',
  };
}
