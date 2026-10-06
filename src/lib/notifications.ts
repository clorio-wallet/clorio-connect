import type { AppMessage } from '@/messages/types';
import { getNetworkApiBaseUrl, type NetworkConfig } from '@/lib/networks';

export const NOTIFICATION_LANGUAGE_STORAGE_KEY = 'clorio_language';

export function getNotificationApiUrl(
  network: NetworkConfig | undefined,
): string | undefined {
  return network ? getNetworkApiBaseUrl(network) : undefined;
}

export type NotificationTransactionType = 'payment' | 'delegation' | 'zkapp';

export interface NotificationTransaction {
  hash: string;
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
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // The service worker can be unavailable while the extension is restarting.
  }
}

export function notifySessionLocked(): void {
  void sendNotificationMessage({ type: 'SESSION_LOCKED' });
}

export function notifySessionUnlocked(): void {
  void sendNotificationMessage({ type: 'SESSION_UNLOCKED' });
}

export function trackTransaction(transaction: NotificationTransaction): void {
  if (!transaction.hash || !transaction.address || !transaction.apiUrl) return;
  void sendNotificationMessage({
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
