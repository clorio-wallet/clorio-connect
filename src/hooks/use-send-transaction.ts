import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGetAccount } from '@/api/mina/mina';
import { broadcastPayment } from '@/api/mina/transactions';
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
  type SignedPayload,
} from '@/lib/ledger';
import type { SignPaymentMessage, SignPaymentResponse } from '@/messages/types';

export interface BroadcastResult {
  kind: 'broadcast';
  id: string;
  hash?: string;
  fee: string;
  amount: string;
}

export interface SignedLedgerPaymentResult {
  kind: 'signed';
  signature: string;
  payload: SignedPayload;
}

export type SendTransactionResult =
  | BroadcastResult
  | SignedLedgerPaymentResult;

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
  const { data: accountData, refetch: refetchAccount } = useGetAccount(
    publicKey || '',
    { query: { enabled: !!publicKey } },
  );

  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const sendWithLedger = async (
    formData: SendTransactionFormData,
  ): Promise<SignedLedgerPaymentResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

    const index = ledgerAccountIndex ?? 0;
    const refreshed = await refetchAccount();
    const nonce = refreshed.data?.nonce ?? accountData?.nonce ?? 0;

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

    return {
      kind: 'signed',
      signature: result.signature,
      payload: result.payload,
    };
  };

  const sendWithSoftware = async (
    formData: SendTransactionFormData,
    password: string,
  ): Promise<BroadcastResult> => {
    if (!publicKey) throw new Error('Wallet not initialized');

    const refreshed = await refetchAccount();
    const nonce = (refreshed.data?.nonce ?? accountData?.nonce ?? 0).toString();

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
      refetchAccount();
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

      refetchAccount();

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
