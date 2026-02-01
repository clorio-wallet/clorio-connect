import { useQuery } from '@tanstack/react-query';
import { customInstance } from '../axios-instance';
import { Transaction } from '@/components/wallet/transaction-list';
import { TransactionCardStatus, TransactionType } from '@/components/wallet/transaction-card';

interface APITransaction {
  hash: string;
  type: string;
  amount: number;
  fee: number;
  sender: string;
  receiver: string;
  timestamp: string;
  status: string;
  memo?: string;
  nonce: number;
  kind: string;
  dateTime: string;
}

export const getTransactions = async (address: string) => {
  return customInstance<APITransaction[]>({
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
      return data.map((tx): Transaction => {
        const isIncoming = tx.receiver === address;
        let type: TransactionType = 'payment';
        if (tx.kind === 'stake_delegation') type = 'delegation';
        if (tx.kind === 'zkapp') type = 'zkapp';

        let status: TransactionCardStatus = 'applied';
        if (tx.status === 'failed') status = 'failed';
        if (tx.status === 'pending') status = 'pending';

        return {
          id: tx.hash,
          type,
          status,
          amount: tx.amount / 1e9, // Assuming API returns nanomina
          fee: tx.fee / 1e9,
          hash: tx.hash,
          timestamp: new Date(tx.dateTime).toLocaleString(),
          sender: tx.sender,
          receiver: tx.receiver,
          isIncoming,
          symbol: 'MINA',
        };
      });
    },
  });
};
