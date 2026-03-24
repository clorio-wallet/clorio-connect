import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@/stores/wallet-store';
import {
  broadcastDelegation,
  useGetAccountNonce,
} from '@/api/mina/transactions';
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

export type DelegateTransactionResult = BroadcastDelegationResult;

export function useDelegateTransaction() {
  const { publicKey, accountType, ledgerAccountIndex } = useWalletStore();
  const { data: accountNonceData, refetch: refetchAccountNonce } =
    useGetAccountNonce(publicKey || '', {
      enabled: !!publicKey,
    });
  const { networkId } = useSettingsStore();

  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const delegateWithLedger = async (
    validatorPublicKey: string,
  ): Promise<BroadcastDelegationResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

    const index = ledgerAccountIndex ?? 0;

    // Refresh to get latest nonce including mempool
    const refreshed = await refetchAccountNonce();
    // Use pendingNonce which includes account nonce + mempool transactions
    const nonce =
      refreshed.data?.pendingNonce ?? accountNonceData?.pendingNonce ?? 0;

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

    // Parse the Ledger signature (hex string) into field and scalar
    const signatureHex = result.signature;
    if (signatureHex.length !== 128) {
      throw LedgerError.signFailed('Invalid signature format from Ledger');
    }

    const field = signatureHex.slice(0, 64);
    const scalar = signatureHex.slice(64, 128);

    // Broadcast the signed delegation
    const delegation = {
      from: publicKey,
      to: validatorPublicKey,
      fee: toNano(DELEGATION_FEE_MINA),
      nonce: nonce.toString(),
      memo: '',
    };

    const broadcastResult = await broadcastDelegation(
      {
        from: delegation.from,
        to: delegation.to,
        fee: delegation.fee,
        nonce: delegation.nonce,
        memo: delegation.memo,
      },
      { field, scalar },
    );

    const broadcastHash = broadcastResult?.hash ?? broadcastResult?.id;
    if (!broadcastHash) {
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

    // Refresh nonce after successful broadcast
    await refetchAccountNonce();
    return { kind: 'broadcast', hash: broadcastHash };
  };

  const delegateWithSoftware = async (
    validatorPublicKey: string,
    password: string,
  ): Promise<BroadcastDelegationResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

    // Refresh to get latest nonce including mempool
    const refreshed = await refetchAccountNonce();
    // Use pendingNonce which includes account nonce + mempool transactions
    const nonce = (
      refreshed.data?.pendingNonce ??
      accountNonceData?.pendingNonce ??
      0
    ).toString();

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
      await refetchAccountNonce();
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

    const broadcastHash = result?.hash ?? result?.id;
    if (!broadcastHash) {
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

    // Refresh nonce after successful broadcast
    await refetchAccountNonce();
    return { kind: 'broadcast', hash: broadcastHash };
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
