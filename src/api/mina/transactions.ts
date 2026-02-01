import { useQuery } from '@tanstack/react-query';
import { customInstance } from '../axios-instance';
import { Transaction } from '@/components/wallet/transaction-list';
import { TransactionCardStatus, TransactionType } from '@/components/wallet/transaction-card';

interface APITransaction {
  hash: string;
  type: string;
  amount: string; // Changed to string based on API response
  fee: string; // Changed to string based on API response
  source: string; // API uses 'source' instead of 'sender'
  receiver: string;
  timestamp: string;
  status: string;
  memo?: string;
  nonce: number;
  kind?: string; // Optional or inferred
  dateTime?: string; // May not be present in new structure
  blockHeight?: number;
}

interface APIResponse {
  total: number;
  transactions: APITransaction[];
}

export const getTransactions = async (address: string) => {
  return customInstance<APIResponse>({
    url: `/v1/mina/transactions/${address}`,
    method: 'GET',
  });
};

export const useGetTransactions = (address: string, options?: { enabled?: boolean; refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: ['transactions', address],
    queryFn: () => getTransactions(address),
    enabled: !!address && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
    select: (data) => {
      const sortedTransactions = [...data.transactions].sort((a, b) => {
        // Sort by blockHeight descending if available
        if (a.blockHeight && b.blockHeight) {
          return b.blockHeight - a.blockHeight;
        }
        // Fallback to dateTime if available
        if (a.dateTime && b.dateTime) {
          return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
        }
        return 0;
      });

      return sortedTransactions.map((tx): Transaction => {
        const isIncoming = tx.receiver === address;
        let type: TransactionType = 'payment';
        // Infer type if not explicitly provided
        if (tx.kind === 'stake_delegation') type = 'delegation';
        if (tx.kind === 'zkapp') type = 'zkapp';

        let status: TransactionCardStatus = 'applied';
        if (tx.status === 'failed') status = 'failed';
        if (tx.status === 'pending') status = 'pending';

        return {
          id: tx.hash,
          type,
          status,
          amount: Number(tx.amount),
          fee: Number(tx.fee),
          hash: tx.hash,
          // Use blockHeight as proxy for timestamp if dateTime missing, or empty string
          timestamp: tx.dateTime ? new Date(tx.dateTime).toLocaleString() : `Block: ${tx.blockHeight}`,
          sender: tx.source, // Map source to sender
          receiver: tx.receiver,
          isIncoming,
          symbol: 'MINA',
        };
      });
    },
  });
};
