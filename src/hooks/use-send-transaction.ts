import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { broadcastPayment, useGetAccountNonce } from '@/api/mina/transactions';
import { useToast } from '@/hooks/use-toast';
import { SendTransactionFormData } from '@/lib/validations';
import { FEATURES } from '@/lib/const';
import { toNano } from '@/lib/utils';
import {
  checkLedgerStatus,
  signLedgerPayment,
  LedgerStatus,
  LedgerError,
  NetworkId,
} from '@/lib/ledger';
import type { SignPaymentMessage, SignPaymentResponse } from '@/messages/types';

export interface BroadcastResult {
  kind: 'broadcast';
  id: string;
  hash?: string;
  fee: string;
  amount: string;
}

export type SendTransactionResult = BroadcastResult;

function toLedgerNetworkId(
  networkLabel: string,
): (typeof NetworkId)[keyof typeof NetworkId] {
  return networkLabel === 'mainnet' ? NetworkId.MAINNET : NetworkId.DEVNET;
}

function mockBroadcastResult(fee: string, amount: string): BroadcastResult {
  const hash =
    '5' +
    Array(52)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
  return { kind: 'broadcast', id: hash.slice(0, 20), hash, fee, amount };
}

export function useSendTransaction() {
  const { publicKey, accountType, ledgerAccountIndex } = useWalletStore();
  const { networkId } = useSettingsStore();
  const { data: accountNonceData, refetch: refetchAccountNonce } =
    useGetAccountNonce(publicKey || '', {
      enabled: !!publicKey,
    });

  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const sendWithLedger = async (
    formData: SendTransactionFormData,
  ): Promise<BroadcastResult> => {
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

    const result = await signLedgerPayment(
      app,
      {
        fromAddress: publicKey,
        toAddress: formData.recipient,
        amount: formData.amount,
        fee: formData.fee,
        nonce,
        memo: formData.memo ?? '',
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
    // Ledger signature format: 64 bytes total - first 32 bytes are field, last 32 bytes are scalar
    const signatureHex = result.signature;
    if (signatureHex.length !== 128) {
      throw LedgerError.signFailed('Invalid signature format from Ledger');
    }

    const field = signatureHex.slice(0, 64);
    const scalar = signatureHex.slice(64, 128);

    // Broadcast the signed transaction
    const payment = {
      from: publicKey,
      to: formData.recipient,
      amount: toNano(formData.amount),
      fee: toNano(formData.fee),
      memo: formData.memo || '',
      nonce: nonce.toString(),
    };

    try {
      const tx = await broadcastPayment(
        {
          from: payment.from,
          to: payment.to,
          amount: payment.amount,
          fee: payment.fee,
          nonce: payment.nonce,
          memo: payment.memo,
        },
        { field, scalar },
      );

      const broadcastId = tx?.id ?? tx?.hash;
      if (!broadcastId) {
        throw new Error(t('send.broadcast_error'));
      }

      // Refresh nonce after successful broadcast
      await refetchAccountNonce();

      toast({
        variant: 'success',
        title: t('common.success'),
        description: t('send.sent_toast'),
      });

      return {
        kind: 'broadcast',
        id: broadcastId,
        hash: tx.hash,
        fee: tx.fee ?? payment.fee,
        amount: tx.amount ?? payment.amount,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('send.error_failed');
      throw new Error(msg);
    }
  };

  const sendWithSoftware = async (
    formData: SendTransactionFormData,
    password: string,
  ): Promise<BroadcastResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

    // Refresh to get latest nonce including mempool
    const refreshed = await refetchAccountNonce();
    // Use pendingNonce which includes account nonce + mempool transactions
    const nonce = (
      refreshed.data?.pendingNonce ??
      accountNonceData?.pendingNonce ??
      0
    ).toString();

    const payment = {
      from: publicKey,
      to: formData.recipient,
      amount: toNano(formData.amount),
      fee: toNano(formData.fee),
      memo: formData.memo || '',
      nonce,
    };

    const message: SignPaymentMessage = {
      type: 'SIGN_PAYMENT',
      payload: { payment, password },
    };

    const responseRaw = await chrome.runtime.sendMessage(message);
    if (!responseRaw || typeof responseRaw !== 'object') {
      throw new Error('No response from signing service');
    }

    const response = responseRaw as SignPaymentResponse | { error: string };
    if ('error' in response) {
      throw new Error(
        (response as { error: string }).error || 'Signing failed',
      );
    }

    const signatureObj = (response as SignPaymentResponse).signature;

    console.log('[useSendTransaction] Received signature:', {
      field: signatureObj.field,
      scalar: signatureObj.scalar,
    });

    if (FEATURES.DRY_RUN_SEND_TX) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockTx = mockBroadcastResult(payment.fee, payment.amount);
      console.log('[useSendTransaction] [DRY RUN] Mock tx hash:', mockTx.hash);
      toast({
        variant: 'success',
        title: t('common.success'),
        description: `[DRY RUN] ${t('send.sent_toast')}`,
      });
      await refetchAccountNonce();
      return mockTx;
    }

    try {
      const tx = await broadcastPayment(
        {
          from: payment.from,
          to: payment.to,
          amount: payment.amount,
          fee: payment.fee,
          nonce: payment.nonce,
          memo: payment.memo,
        },
        {
          field: signatureObj.field,
          scalar: signatureObj.scalar,
        },
      );

      const broadcastId = tx?.id ?? tx?.hash;
      if (!broadcastId) {
        throw new Error(t('send.broadcast_error'));
      }

      // Refresh nonce after successful broadcast
      await refetchAccountNonce();

      toast({
        variant: 'success',
        title: t('common.success'),
        description: t('send.sent_toast'),
      });

      return {
        kind: 'broadcast',
        id: broadcastId,
        hash: tx.hash,
        fee: tx.fee ?? payment.fee,
        amount: tx.amount ?? payment.amount,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('send.error_failed');
      throw new Error(msg);
    }
  };

  const sendTransaction = async (
    formData: SendTransactionFormData,
    password: string,
  ): Promise<SendTransactionResult> => {
    setLoading(true);
    try {
      if (accountType === 'ledger') {
        return await sendWithLedger(formData);
      }
      return await sendWithSoftware(formData, password);
    } finally {
      setLoading(false);
    }
  };

  return {
    sendTransaction,
    loading,
    isLedger: accountType === 'ledger',
  };
}
