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
  timestamp: string | number;
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

function getRecordProp<T = unknown>(obj: unknown, key: string): T | undefined {
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

function pickFirst<T = unknown>(
  obj: Record<string, unknown>,
  keys: string[],
): T {
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

interface TransactionsResponse {
  total: number;
  transactions: unknown[];
  mempool: unknown[];
}

function normalizeMempoolTx(
  tx: Record<string, unknown>,
  address: string,
): Transaction {
  const receiver =
    asString(
      pickFirst(tx, ['receiver', 'to', 'toAddress', 'receiverAddress']),
    ) ?? '';
  const sender =
    asString(
      pickFirst(tx, [
        'sender',
        'from',
        'fromAddress',
        'senderAddress',
        'source',
      ]),
    ) ?? '';
  const isIncoming = sender !== address;

  return {
    id: asString(tx.id) ?? asString(tx.hash) ?? '',
    type: normalizeTransactionType(tx.type),
    status: 'pending',
    amount:
      asNumber(pickFirst(tx, ['amount', 'amountNano', 'value', 'total'])) ?? 0,
    fee: asNumber(pickFirst(tx, ['fee', 'feeNano', 'networkFee'])) ?? 0,
    hash: asString(tx.hash) ?? asString(tx.id) ?? '',
    timestamp: Date.now().toString(),
    sender,
    receiver,
    isIncoming,
    symbol: asString(tx.symbol) ?? 'MINA',
    memo: asString(tx.memo),
    nonce: asNumber(tx.nonce),
    blockHeight: undefined,
  };
}

function normalizeTx(
  tx: Record<string, unknown>,
  address: string,
): Transaction {
  const receiver =
    asString(
      pickFirst(tx, ['receiver', 'to', 'toAddress', 'receiverAddress']),
    ) ?? '';
  const sender =
    asString(
      pickFirst(tx, [
        'sender',
        'from',
        'fromAddress',
        'senderAddress',
        'source',
      ]),
    ) ?? '';
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
    hash: asString(pickFirst(tx, ['hash', 'txHash', 'transactionHash'])) ?? '',
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
}

export const getTransactions = async (
  address: string,
  signal?: AbortSignal,
): Promise<Transaction[]> => {
  const response = await customInstance<TransactionsResponse>({
    url: `/v1/mina/transactions/${address}`,
    method: 'GET',
    signal,
  });

  const transactions = Array.isArray(response.transactions)
    ? response.transactions
        .filter(isRecord)
        .map((tx) => normalizeTx(tx, address))
    : [];

  const mempool = Array.isArray(response.mempool)
    ? response.mempool
        .filter(isRecord)
        .map((tx) => normalizeMempoolTx(tx, address))
    : [];

  // Combine mempool (pending) transactions first, then confirmed transactions
  return [...mempool, ...transactions];
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
    url: '/v1/mina/transaction/delegation',
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
    asString(
      pickFirst(tx, ['receiver', 'to', 'toAddress', 'receiverAddress']),
    ) ?? '';
  const sender =
    asString(
      pickFirst(tx, [
        'sender',
        'from',
        'fromAddress',
        'senderAddress',
        'source',
      ]),
    ) ?? '';

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

// ─── Mempool API ────────────────────────────────────────────────────────────────

export interface MempoolResponse {
  mempool: unknown[];
}

export const getMempool = async (
  publicKey: string,
  signal?: AbortSignal,
): Promise<Transaction[]> => {
  const response = await customInstance<MempoolResponse>({
    url: `/v1/mina/mempool/${publicKey}`,
    method: 'GET',
    signal,
  });

  const mempool = Array.isArray(response.mempool)
    ? response.mempool
        .filter(isRecord)
        .map((tx) => normalizeMempoolTx(tx, publicKey))
    : [];

  return mempool;
};

export const useGetMempool = (
  publicKey: string,
  options?: Omit<UseQueryOptions<Transaction[], Error>, 'queryKey'>,
): UseQueryResult<Transaction[], Error> => {
  const networkId = useSettingsStore((s) => s.networkId);
  return useQuery({
    queryKey: ['mempool', publicKey, networkId],
    queryFn: ({ signal }) => getMempool(publicKey, signal),
    enabled: !!publicKey,
    staleTime: 30 * 1000, // 30 seconds - mempool changes frequently
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    ...options,
  });
};

// ─── Account with Mempool Nonce ────────────────────────────────────────────────

export interface AccountWithPendingNonce {
  nonce: number;
  pendingNonce: number;
  mempoolCount: number;
}

export const getAccountNonce = async (
  publicKey: string,
  signal?: AbortSignal,
): Promise<AccountWithPendingNonce> => {
  // Fetch account and mempool in parallel
  const [accountResponse, mempoolResponse] = await Promise.all([
    customInstance<{ nonce: number }>({
      url: `/v1/mina/accounts/${publicKey}`,
      method: 'GET',
      signal,
    }),
    customInstance<MempoolResponse>({
      url: `/v1/mina/mempool/${publicKey}`,
      method: 'GET',
      signal,
    }).catch(() => ({ mempool: [] })), // Gracefully handle mempool errors
  ]);

  const accountNonce = accountResponse.nonce ?? 0;

  // Count outgoing mempool transactions from this address
  const mempool = Array.isArray(mempoolResponse.mempool)
    ? (mempoolResponse.mempool.filter(isRecord) as Record<string, unknown>[])
    : [];

  const outgoingMempoolCount = mempool.filter((tx: Record<string, unknown>) => {
    const sender =
      asString(
        pickFirst(tx, [
          'sender',
          'from',
          'fromAddress',
          'senderAddress',
          'source',
        ]),
      ) ?? '';
    return sender === publicKey;
  }).length;

  // Calculate the pending nonce (account nonce + number of pending transactions)
  const pendingNonce = accountNonce + outgoingMempoolCount;

  return {
    nonce: accountNonce,
    pendingNonce,
    mempoolCount: outgoingMempoolCount,
  };
};

export const useGetAccountNonce = (
  publicKey: string,
  options?: Omit<UseQueryOptions<AccountWithPendingNonce, Error>, 'queryKey'>,
): UseQueryResult<AccountWithPendingNonce, Error> => {
  const networkId = useSettingsStore((s) => s.networkId);
  return useQuery({
    queryKey: ['account-nonce', publicKey, networkId],
    queryFn: ({ signal }) => getAccountNonce(publicKey, signal),
    enabled: !!publicKey,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    ...options,
  });
};
