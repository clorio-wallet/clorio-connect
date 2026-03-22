import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { customInstance } from '../axios-instance';
import { useSettingsStore } from '@/stores/settings-store';

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
  nonce?: number;
  blockHeight?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getRecordProp<T = unknown>(
  obj: unknown,
  key: string,
): T | undefined {
  if (!isRecord(obj)) return undefined;
  return obj[key] as T | undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asTimestampString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return undefined;
}

function pickFirst<T = unknown>(obj: Record<string, unknown>, keys: string[]): T {
  for (const key of keys) {
    if (key in obj) return obj[key] as T;
  }
  return undefined as T;
}

function normalizeTransactionType(value: unknown): TransactionType {
  const v = asString(value)?.toLowerCase();
  if (v === 'payment' || v === 'delegation' || v === 'zkapp') return v;
  return 'payment';
}

function normalizeTransactionStatus(value: unknown): TransactionStatus {
  const v = asString(value)?.toLowerCase();
  if (v === 'pending' || v === 'applied' || v === 'failed') return v;
  return 'applied';
}

export const getTransactions = async (
  address: string,
  signal?: AbortSignal,
): Promise<Transaction[]> => {
  const response = await customInstance<unknown>({
    url: `/v1/mina/transactions/${address}`,
    method: 'GET',
    signal,
  });

  const responseContent = Array.isArray(response)
    ? response
    : (getRecordProp<unknown>(response, 'content') ??
        getRecordProp<unknown>(response, 'data') ??
        getRecordProp<unknown>(response, 'transactions'));

  const data = Array.isArray(responseContent) ? responseContent : [];

  return data.map((txRaw) => {
    const tx = isRecord(txRaw) ? txRaw : {};

    const receiver =
      asString(pickFirst(tx, ['receiver', 'to', 'toAddress', 'receiverAddress'])) ??
      '';
    const sender =
      asString(pickFirst(tx, ['sender', 'from', 'fromAddress', 'senderAddress'])) ??
      '';
    const isIncoming =
      getRecordProp<boolean>(tx, 'isIncoming') ??
      (receiver === address && receiver.length > 0);

    return {
      id: asString(tx.id) ?? asString(tx.hash) ?? '',
      type: normalizeTransactionType(tx.type),
      status: normalizeTransactionStatus(tx.status),
      amount:
        asNumber(pickFirst(tx, ['amount', 'amountNano', 'value', 'total'])) ?? 0,
      fee: asNumber(pickFirst(tx, ['fee', 'feeNano', 'networkFee'])) ?? 0,
      hash:
        asString(pickFirst(tx, ['hash', 'txHash', 'transactionHash'])) ?? '',
      timestamp:
        asTimestampString(pickFirst(tx, ['timestamp', 'dateTime', 'date'])) ?? '',
      sender,
      receiver,
      isIncoming,
      symbol: asString(tx.symbol) ?? 'MINA',
      memo: asString(tx.memo),
      nonce: asNumber(tx.nonce),
      blockHeight: asNumber(tx.blockHeight),
    };
  });
};

export const useGetTransactions = (
  address: string,
  options?: Omit<UseQueryOptions<Transaction[], Error>, 'queryKey'>,
): UseQueryResult<Transaction[], Error> => {
  const networkId = useSettingsStore((s) => s.networkId);
  return useQuery({
    queryKey: ['transactions', address, networkId],
    queryFn: ({ signal }) => getTransactions(address, signal),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};


export interface BroadcastPaymentInput {
  from: string;
  to: string;
  amount: string;
  fee: string;
  nonce: string;
  memo: string;
  validUntil?: string;
}

export interface BroadcastSignature {
  field: string;
  scalar: string;
}

export interface BroadcastResult {
  hash?: string;
  id?: string;
  fee?: string;
  amount?: string;
}

export const broadcastPayment = (
  input: BroadcastPaymentInput,
  signature: BroadcastSignature,
): Promise<BroadcastResult> =>
  customInstance<BroadcastResult>({
    url: '/v1/mina/transaction',
    method: 'POST',
    data: { input, signature },
  });

export const broadcastDelegation = (
  input: Omit<BroadcastPaymentInput, 'amount'>,
  signature: BroadcastSignature,
): Promise<BroadcastResult> =>
  customInstance<BroadcastResult>({
    url: '/v1/mina/transactions/delegation',
    method: 'POST',
    data: { input, signature },
  });


export const getTransaction = async (
  hash: string,
  signal?: AbortSignal,
): Promise<Transaction> => {
  const response = await customInstance<unknown>({
    url: `/v1/mina/transaction/${hash}`,
    method: 'GET',
    signal,
  });

  const txRaw = getRecordProp<unknown>(response, 'data') ?? response;
  const tx = isRecord(txRaw) ? txRaw : {};

  const receiver =
    asString(pickFirst(tx, ['receiver', 'to', 'toAddress', 'receiverAddress'])) ??
    '';
  const sender =
    asString(pickFirst(tx, ['sender', 'from', 'fromAddress', 'senderAddress', 'source'])) ??
    '';

  return {
    id: asString(tx.id) ?? asString(tx.hash) ?? '',
    type: normalizeTransactionType(tx.type),
    status: normalizeTransactionStatus(tx.status),
    amount:
      asNumber(pickFirst(tx, ['amount', 'amountNano', 'value', 'total'])) ?? 0,
    fee: asNumber(pickFirst(tx, ['fee', 'feeNano', 'networkFee'])) ?? 0,
    hash:
      asString(pickFirst(tx, ['hash', 'txHash', 'transactionHash'])) ?? hash,
    timestamp:
      asTimestampString(pickFirst(tx, ['timestamp', 'dateTime', 'date'])) ?? '',
    sender,
    receiver,
    isIncoming: false,
    symbol: asString(tx.symbol) ?? 'MINA',
    memo: asString(tx.memo),
    nonce: asNumber(tx.nonce),
    blockHeight: asNumber(tx.blockHeight),
  };
};

export const useGetTransaction = (
  hash: string | null,
  options?: Omit<UseQueryOptions<Transaction, Error>, 'queryKey'>,
): UseQueryResult<Transaction, Error> => {
  const networkId = useSettingsStore((s) => s.networkId);
  return useQuery({
    queryKey: ['transaction', hash, networkId],
    queryFn: ({ signal }) => getTransaction(hash!, signal),
    enabled: !!hash,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
