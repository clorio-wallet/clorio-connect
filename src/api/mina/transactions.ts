import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { customInstance } from '../axios-instance';

export type TransactionType = 'payment' | 'delegation' | 'zkapp';
export type TransactionStatus = 'pending' | 'applied' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  hash: string;
  timestamp: string;
  sender: string;
  receiver: string;
  isIncoming: boolean;
  symbol?: string;
  memo?: string;
}

export const getTransactions = async (
  address: string,
  signal?: AbortSignal
): Promise<Transaction[]> => {
  const response = await customInstance<any>({
    url: `/v1/mina/transactions/${address}`,
    method: 'GET',
    signal,
  });

  const data = Array.isArray(response)
    ? response
    : response.content || response.data || response.transactions || [];

  return data.map((tx: any) => ({
    id: tx.id || tx.hash,
    type: tx.type?.toLowerCase(),
    status: tx.status?.toLowerCase() || 'applied',
    amount: tx.amount,
    fee: tx.fee,
    hash: tx.hash,
    timestamp: tx.timestamp || tx.dateTime,
    sender: tx.sender || tx.from,
    receiver: tx.receiver || tx.to,
    isIncoming:
      tx.isIncoming ??
      (tx.receiver === address || tx.to === address),
    symbol: tx.symbol || 'MINA',
    memo: tx.memo,
  }));
};

export const useGetTransactions = (
  address: string,
  options?: Omit<UseQueryOptions<Transaction[], Error>, 'queryKey'>
): UseQueryResult<Transaction[], Error> => {
  return useQuery({
    queryKey: ['transactions', address],
    queryFn: ({ signal }) => getTransactions(address, signal),
    enabled: !!address,
    ...options,
  });
};
