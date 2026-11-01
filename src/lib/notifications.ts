import type { AppMessage } from '@/messages/types';
import { getNetworkApiBaseUrl, type NetworkConfig } from '@/lib/networks';

export const NOTIFICATION_LANGUAGE_STORAGE_KEY = 'clorio_language';

export function getNotificationApiUrl(
  network: NetworkConfig | undefined,
): string | undefined {
  return (network && getNetworkApiBaseUrl(network)) || import.meta.env.VITE_API_URL || undefined;
}

export type NotificationTransactionType = 'payment' | 'delegation' | 'zkapp';

export interface NotificationTransaction {
  hash: string;
  nonce?: number;
  address: string;
  apiUrl: string;
  networkId: string;
  type: NotificationTransactionType;
}

export function sessionNotificationEvent(
  wasAuthenticated: boolean,
  isAuthenticated: boolean,
): 'SESSION_LOCKED' | 'SESSION_UNLOCKED' | null {
  if (wasAuthenticated && !isAuthenticated) return 'SESSION_LOCKED';
  if (!wasAuthenticated && isAuthenticated) return 'SESSION_UNLOCKED';
  return null;
}

export async function sendNotificationMessage(
  message: AppMessage,
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    console.warn('[notifications] Chrome runtime is unavailable');
    return;
  }

  console.info('[notifications] sending message:', message.type);
  try {
    const response = (await chrome.runtime.sendMessage(message)) as
      | { ok?: boolean }
      | undefined;
    if (response?.ok === false) {
      throw new Error('Notification message was rejected by the service worker');
    }
    console.info('[notifications] message handled:', message.type);
  } catch (error) {
    console.error('[notifications] message failed:', message.type, error);
  }
}

export function notifySessionLocked(): void {
  void sendNotificationMessage({ type: 'SESSION_LOCKED' });
}

export function notifySessionUnlocked(): void {
  void sendNotificationMessage({ type: 'SESSION_UNLOCKED' });
}

export async function trackTransaction(
  transaction: NotificationTransaction,
): Promise<void> {
  if (!transaction.hash || !transaction.address || !transaction.apiUrl) {
    console.warn('[notifications] transaction tracking skipped: incomplete data');
    return;
  }

  console.info('[notifications] tracking transaction:', {
    hash: transaction.hash.slice(0, 12),
    networkId: transaction.networkId,
    type: transaction.type,
  });
  await sendNotificationMessage({
    type: 'TRACK_TRANSACTION',
    payload: transaction,
  });
}

export function changeNotificationLanguage(language: string): void {
  void sendNotificationMessage({
    type: 'LANGUAGE_CHANGED',
    language: language.split('-')[0],
  });
}

/** Register pending transactions discovered in account history or mempool. */
export async function trackPendingTransactions(
  transactions: ReadonlyArray<{ hash: string; status: string; type: NotificationTransactionType; nonce?: number }>,
  context: { address: string; networkId: string; apiUrl: string | undefined },
): Promise<void> {
  if (!context.apiUrl || !context.address) return;
  const hashes = new Set<string>();
  for (const transaction of transactions) {
    if (transaction.status !== 'pending' || !transaction.hash || hashes.has(transaction.hash)) continue;
    hashes.add(transaction.hash);
    await trackTransaction({ ...context, apiUrl: context.apiUrl, hash: transaction.hash, type: transaction.type, ...(transaction.nonce !== undefined ? { nonce: transaction.nonce } : {}) });
  }
}
