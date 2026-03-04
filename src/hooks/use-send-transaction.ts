import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { client } from '@/lib/graphql/client';
import { useWalletStore } from '@/stores/wallet-store';
import { useGetAccount } from '@/api/mina/mina';
import { useToast } from '@/hooks/use-toast';
import { SendTransactionFormData } from '@/lib/validations';
import { FEATURES } from '@/lib/const';
import { toNano } from '@/lib/utils';

// Mirror of graphQL doc defined in src/graphql/mutations/transaction.ts
// added here so the hook can operate even before codegen is run.
const BROADCAST_TRANSACTION_MUTATION = gql`
  mutation BroadcastTransaction($input: SendPaymentInput!, $signature: SignatureInput) {
    broadcastTransaction(input: $input, signature: $signature) {
      id
      hash
      fee
      amount
    }
  }
`;

interface BroadcastResult {
  id: string;
  hash: string;
  fee: string;
  amount: string;
}

// we can rely on the shared message types now instead of duplicating them here
import type {
  SignPaymentMessage,
  SignPaymentResponse,
} from '@/messages/types';

// NOTE: the imported `SignPaymentMessage` already includes `password` under
// `payload`, so we don't need any local declaration.
export function useSendTransaction() {
  const { publicKey } = useWalletStore();
  const { data: accountData, refetch: refetchAccount } = useGetAccount(
    publicKey || '',
    { query: { enabled: !!publicKey } },
  );

  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const sendTransaction = async (
    formData: SendTransactionFormData,
    password: string,
  ): Promise<BroadcastResult> => {
    if (!publicKey) {
      throw new Error('Wallet not initialized');
    }

    const nonce = (accountData?.nonce ?? 0).toString();

    // build payment object for signing and broadcast
    const payment = {
      from: publicKey,
      to: formData.recipient,
      // convert decimal values to integer nanomina strings
      amount: toNano(formData.amount),
      fee: toNano(formData.fee),
      memo: formData.memo || '',
      nonce,
    };

    // ask background to sign
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
      throw new Error(response.error || 'Signing failed');
    }

    const signatureObj = (response as SignPaymentResponse).signature;

    // Real broadcast mode
    // Dry-run mode: simulate broadcast without actually sending to blockchain
    if (FEATURES.DRY_RUN_SEND_TX) {
      setLoading(true);
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Generate mock hash
        const mockHash = '5' + Array(52).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        const mockTx: BroadcastResult = {
          id: mockHash.slice(0, 20),
          hash: mockHash,
          fee: payment.fee,
          amount: payment.amount,
        };

        // Show success toast
        toast({
          variant: 'success',
          title: t('common.success'),
          description: `[DRY RUN] ${t('send.sent_toast')}`,
        });

        return mockTx;
      } finally {
        setLoading(false);
      }
    }

    try {
      const result = await client.mutate<{
        broadcastTransaction: BroadcastResult;
      }>({
        mutation: BROADCAST_TRANSACTION_MUTATION,
        variables: {
          input: payment,
          signature: {
            field: signatureObj.field,
            scalar: signatureObj.scalar,
          },
        },
      });


      const tx = result.data?.broadcastTransaction;
      if (!tx || !tx.hash) {
        throw new Error(t('send.broadcast_error'));
      }

      // refetch account/balance to pick up new nonce/balance
      refetchAccount();

      toast({
        variant: 'success',
        title: t('common.success'),
        description: t('send.sent_toast'),
      });

      return tx;
    } catch (err) {
      // bubble up with toast message for the form
      const message =
        err instanceof Error ? err.message : t('send.error_failed');
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    sendTransaction,
    loading,
  };
}
