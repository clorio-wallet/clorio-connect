import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import type { AppMessage } from '../messages/types';
import type {
  NotificationTransaction,
  NotificationTransactionType,
} from '../lib/notifications';

const WATCHES_STORAGE_KEY = 'clorio_notification_transaction_watches';
const DELIVERED_STORAGE_KEY = 'clorio_notification_delivered_transactions';
const LANGUAGE_STORAGE_KEY = 'clorio_language';
const TRANSACTION_ALARM = 'clorio_transaction_notifications';
const ICON_URL = 'icon-48.png';

type Locale = 'en' | 'es' | 'fr' | 'de';
type TransactionStatus = 'pending' | 'applied' | 'failed' | 'dropped';
type NotificationKey =
  | 'notifications.dapp.request'
  | 'notifications.transaction.applied'
  | 'notifications.transaction.failed'
  | 'notifications.transaction.dropped'
  | 'notifications.session.locked'
  | 'notifications.session.unlocked'
  | 'notifications.software_update';

const resources = { en, es, fr, de } as const;

export interface TransactionWatch extends NotificationTransaction {
  lastStatus: TransactionStatus;
  missingSince?: number;
  missingRetries?: number;
  nextMissingCheckAt?: number;
}

export interface TransactionStatusResult {
  status: TransactionStatus | 'missing';
  hash?: string;
}

export type TransactionStatusFetcher = (input: {
  apiUrl: string;
  hash: string;
  address?: string;
  nonce?: number;
}) => Promise<TransactionStatusResult>;

interface NotificationCopy {
  title: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNestedValue(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    return isRecord(current) ? current[key] : undefined;
  }, value);
}

function interpolate(value: string, variables: Record<string, string>): string {
  return value.replace(/{{(\w+)}}/g, (_match, key: string) => variables[key] ?? '');
}

function normalizeLocale(language: string | undefined): Locale {
  const normalized = language?.split('-')[0].toLowerCase();
  return normalized === 'es' || normalized === 'fr' || normalized === 'de'
    ? normalized
    : 'en';
}

export function getNotificationCopy(
  language: string,
  key: NotificationKey | string,
  variables: Record<string, string> = {},
): NotificationCopy {
  const locale = normalizeLocale(language);
  const localized = resources[locale];
  const fallback = resources.en;
  const title =
    getNestedValue(localized, 'notifications.title') ??
    getNestedValue(fallback, 'notifications.title') ??
    'Clorio Connect';
  const message =
    getNestedValue(localized, key) ?? getNestedValue(fallback, key) ?? key;

  return {
    title: String(title),
    message: interpolate(String(message), variables),
  };
}

export function notificationId(kind: string, key: string): string {
  return `clorio_${kind}_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function isTransaction(value: unknown): value is NotificationTransaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.hash === 'string' &&
    value.hash.length > 0 &&
    typeof value.address === 'string' &&
    value.address.length > 0 &&
    typeof value.apiUrl === 'string' &&
    value.apiUrl.length > 0 &&
    typeof value.networkId === 'string' &&
    value.networkId.length > 0 &&
    (value.type === 'payment' ||
      value.type === 'delegation' ||
      value.type === 'zkapp')
  );
}

export function isNotificationMessage(message: unknown): boolean {
  if (!isRecord(message) || typeof message.type !== 'string') return false;

  switch (message.type) {
    case 'SESSION_LOCKED':
    case 'SESSION_UNLOCKED':
      return true;
    case 'LANGUAGE_CHANGED':
      return typeof message.language === 'string';
    case 'TRACK_TRANSACTION':
      return isTransaction(message.payload);
    case 'SHOW_NATIVE_NOTIFICATION':
      return (
        isRecord(message.payload) &&
        typeof message.payload.id === 'string' &&
        typeof message.payload.title === 'string' &&
        typeof message.payload.message === 'string' &&
        (message.payload.priority === undefined ||
          typeof message.payload.priority === 'number')
      );
    default:
      return false;
  }
}

export function shouldNotifyForInstallReason(reason: string): boolean {
  return reason === 'update';
}

export function transactionWatchId(watch: Pick<TransactionWatch, 'networkId' | 'hash'>): string {
  return `${watch.networkId}:${watch.hash}`;
}

export function transitionTransactionWatch(
  watch: TransactionWatch,
  status: TransactionStatus,
): {
  next: TransactionWatch | null;
  notification: { key: 'transaction.applied' | 'transaction.failed' | 'transaction.dropped' } | null;
} {
  if (status === 'pending') {
    return { next: { ...watch, lastStatus: status }, notification: null };
  }

  return {
    next: null,
    notification: {
      key: status === 'applied' ? 'transaction.applied' : status === 'dropped' ? 'transaction.dropped' : 'transaction.failed',
    },
  };
}

async function readLanguage(): Promise<Locale> {
  try {
    const result = await chrome.storage.local.get(LANGUAGE_STORAGE_KEY);
    const language = result[LANGUAGE_STORAGE_KEY];
    return normalizeLocale(typeof language === 'string' ? language : undefined);
  } catch {
    return 'en';
  }
}

async function createNotification(
  id: string,
  copy: NotificationCopy,
  priority = 1,
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.notifications?.create) {
    throw new Error('Notifications API is unavailable');
  }

  console.info('[notifications] creating notification:', {
    id,
    title: copy.title,
    priority,
  });

  try {
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: ICON_URL,
      title: copy.title,
      message: copy.message,
      priority,
    });
    console.info('[notifications] notification created:', id);
  } catch (error) {
    console.error('[notifications] notification creation failed:', id, error);
    throw error;
  }
}

async function showLocalizedNotification(
  id: string,
  key: NotificationKey,
  variables: Record<string, string> = {},
  priority = 1,
): Promise<void> {
  const language = await readLanguage();
  await createNotification(id, getNotificationCopy(language, key, variables), priority);
}

export function showDappRequestNotification(): void {
  void showLocalizedNotification(
    notificationId('dapp', 'request'),
    'notifications.dapp.request',
    {},
    2,
  ).catch((error) => console.warn('[notifications] dapp notification failed:', error));
}

async function readWatches(): Promise<Record<string, TransactionWatch>> {
  const result = await chrome.storage.local.get(WATCHES_STORAGE_KEY);
  const value = result[WATCHES_STORAGE_KEY];
  const watches = isRecord(value)
    ? (value as Record<string, TransactionWatch>)
    : {};
  console.info('[notifications] loaded transaction watches:', Object.keys(watches).length);
  return watches;
}

async function writeWatches(
  watches: Record<string, TransactionWatch>,
): Promise<void> {
  await chrome.storage.local.set({ [WATCHES_STORAGE_KEY]: watches });
}

// Serialize storage mutations so an alarm cannot overwrite a newly registered watch.
let watchQueue: Promise<unknown> = Promise.resolve();
function withWatchLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = watchQueue.then(operation);
  watchQueue = result.catch(() => undefined);
  return result;
}

async function ensureTransactionAlarm(): Promise<void> {
  if (!(await chrome.alarms.get(TRANSACTION_ALARM))) {
    await chrome.alarms.create(TRANSACTION_ALARM, {
      delayInMinutes: 1,
      periodInMinutes: 1,
    });
  }
}

export async function isWalletUiOpen(): Promise<boolean> {
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({});
    return contexts.some((context) =>
      ['POPUP', 'SIDE_PANEL', 'TAB'].includes(context.contextType),
    );
  }
  // Firefox uses a persistent background page rather than a service worker.
  return (chrome.extension?.getViews?.() ?? []).some((view) =>
    !view.location.pathname.endsWith('/background.html'),
  );
}

export function registerTransactionWatch(
  transaction: NotificationTransaction,
): Promise<void> {
  return withWatchLock(async () => {
    await ensureTransactionAlarm();
    const watches = await readWatches();
    const id = transactionWatchId(transaction);
    const delivered = (await chrome.storage.local.get(DELIVERED_STORAGE_KEY))[DELIVERED_STORAGE_KEY];
    if (isRecord(delivered) && delivered[id]) return;
    if (watches[id]) {
      if (watches[id].nonce === undefined && transaction.nonce !== undefined) {
        watches[id].nonce = transaction.nonce;
        await writeWatches(watches);
      }
      return;
    }
    watches[id] ??= { ...transaction, lastStatus: 'pending' };
    await writeWatches(watches);
    console.info('[notifications] transaction watch stored:', id);
  });
}

export const defaultFetchTransactionStatus: TransactionStatusFetcher = async ({
  apiUrl, hash, address, nonce,
}) => {
  const baseUrl = apiUrl.replace(/\/$/, '');
  async function checkHistory(): Promise<TransactionStatusResult> {
    if (!address) throw new Error('Missing transaction address');
    const response = await fetch(`${baseUrl}/v1/mina/transactions/${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Transaction history: ${response.status}`);
    const body: unknown = await response.json();
    const record = isRecord(body) && isRecord(body.data) ? body.data : body;
    if (!isRecord(record) || !Array.isArray(record.transactions) || !Array.isArray(record.mempool)) {
      throw new Error('Unknown transaction history or mempool response');
    }
    const matches = (tx: unknown) => isRecord(tx) && (
      tx.hash === hash || tx.id === hash ||
      (nonce !== undefined &&
        (tx.sender ?? tx.source ?? tx.from ?? tx.fromAddress ?? tx.senderAddress) === address &&
        tx.nonce !== undefined && Number(tx.nonce) === nonce)
    );
    const transaction = record.transactions.find(matches);
    if (isRecord(transaction)) {
      const status = transaction.status;
      if (status !== 'applied' && status !== 'failed' && status !== 'pending') {
        throw new Error('Unknown transaction status');
      }
      return { status, hash: typeof transaction.hash === 'string' ? transaction.hash : undefined };
    }
    return { status: record.mempool.some(matches) ? 'pending' : 'missing' };
  }
  // Serialized mempool IDs cannot be queried as transaction hashes.
  if (!hash.startsWith('5') && address && nonce !== undefined) return checkHistory();
  const response = await fetch(`${baseUrl}/v1/mina/transaction/${encodeURIComponent(hash)}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404 && address) return checkHistory();
  if (!response.ok) throw new Error(`Transaction status: ${response.status}`);
  const body: unknown = await response.json();
  const record = isRecord(body) && isRecord(body.data) ? body.data : body;
  const status = isRecord(record) ? record.status : undefined;
  if (status !== 'pending' && status !== 'applied' && status !== 'failed') {
    throw new Error('Unknown transaction status');
  }
  if (status === 'pending' && address) return checkHistory();
  return { status };
};

async function pollTransactionWatchesOnce(
  fetcher: TransactionStatusFetcher = defaultFetchTransactionStatus,
): Promise<void> {
  const watches = await readWatches();
  let changed = false;

  for (const [id, watch] of Object.entries(watches)) {
    try {
      if (watch.lastStatus === 'pending' && watch.nextMissingCheckAt && Date.now() < watch.nextMissingCheckAt) continue;
      console.info('[notifications] checking transaction:', watch.hash.slice(0, 12));
      let result: TransactionStatusResult = watch.lastStatus === 'pending'
        ? await fetcher({ apiUrl: watch.apiUrl, hash: watch.hash, address: watch.address, nonce: watch.nonce })
        : { status: watch.lastStatus, hash: watch.hash };
      console.info('[notifications] transaction status:', {
        hash: watch.hash.slice(0, 12),
        status: result.status,
      });
      if (result.status === 'missing') {
        const now = Date.now();
        const missingSince = watch.missingSince ?? now;
        const missingRetries = watch.missingSince === undefined ? 0 : (watch.missingRetries ?? 0) + 1;
        if (missingRetries < 2 || now - missingSince < 5 * 60_000) {
          watches[id] = { ...watch, missingSince, missingRetries,
            nextMissingCheckAt: missingSince + (missingRetries === 0 ? 150_000 : 300_000) };
          changed = true;
          console.info('[notifications] transaction absent; scheduled retry:', { id, missingRetries, nextCheckAt: watches[id].nextMissingCheckAt });
          continue;
        }
        result = { status: 'dropped' };
      } else if (result.status === 'pending') {
        delete watch.missingSince;
        delete watch.missingRetries;
        delete watch.nextMissingCheckAt;
      }
      const finalStatus: TransactionStatus = result.status === 'missing' ? 'dropped' : result.status;
      const transition = transitionTransactionWatch(watch, finalStatus);
      if (!transition.next) {
        console.info('[notifications] transaction reached final status:', {
          hash: watch.hash.slice(0, 12),
          status: result.status,
        });
        // Persist the final status before delivery: retry notification failures even
        // if the API is unavailable on the next alarm.
        watches[id] = { ...watch, hash: result.hash ?? watch.hash, lastStatus: finalStatus };
        await writeWatches(watches);
        await showLocalizedNotification(
          notificationId('transaction', id),
          `notifications.${transition.notification?.key}` as NotificationKey,
          { hash: (result.hash ?? watch.hash).slice(0, 12) },
        );
        const stored = (await chrome.storage.local.get(DELIVERED_STORAGE_KEY))[DELIVERED_STORAGE_KEY];
        const delivered = isRecord(stored) ? stored : {};
        delivered[id] = true;
        await chrome.storage.local.set({ [DELIVERED_STORAGE_KEY]: delivered });
        delete watches[id];
      } else {
        watches[id] = transition.next;
      }
      changed = true;
    } catch (error) {
      console.warn(
        '[notifications] transaction status check failed:',
        watch.hash.slice(0, 12),
        error,
      );
      // Keep failed network checks so the next alarm can retry them.
    }
  }

  if (changed) await writeWatches(watches);
}

let activePoll: Promise<void> | undefined;
export function pollTransactionWatches(
  fetcher: TransactionStatusFetcher = defaultFetchTransactionStatus,
): Promise<void> {
  activePoll ??= withWatchLock(() => pollTransactionWatchesOnce(fetcher))
    .finally(() => { activePoll = undefined; });
  return activePoll;
}

async function handleNotificationMessage(message: AppMessage): Promise<void> {
  console.info('[notifications] handling message:', message.type);

  switch (message.type) {
    case 'SHOW_NATIVE_NOTIFICATION':
      await createNotification(
        message.payload.id,
        { title: message.payload.title, message: message.payload.message },
        message.payload.priority,
      );
      return;
    case 'TRACK_TRANSACTION':
      await registerTransactionWatch(message.payload);
      void pollTransactionWatches().catch(console.error);
      return;
    case 'SESSION_LOCKED':
      if (await isWalletUiOpen()) return;
      await showLocalizedNotification(
        notificationId('session', 'locked'),
        'notifications.session.locked',
      );
      return;
    case 'SESSION_UNLOCKED':
      if (await isWalletUiOpen()) return;
      await showLocalizedNotification(
        notificationId('session', 'unlocked'),
        'notifications.session.unlocked',
      );
      return;
    case 'LANGUAGE_CHANGED':
      await chrome.storage.local.set({
        [LANGUAGE_STORAGE_KEY]: normalizeLocale(message.language),
      });
      return;
  }
}

export function registerNotificationHandlers(): void {
  if (typeof chrome === 'undefined') {
    console.warn('[notifications] Chrome runtime is unavailable');
    return;
  }

  console.info('[notifications] registering background handlers');
  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse) => {
      if (!isNotificationMessage(message)) return false;
      const notificationMessage = message as AppMessage;
      console.info('[notifications] received message:', notificationMessage.type);
      void handleNotificationMessage(notificationMessage)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => {
          console.error(
            '[notifications] message handling failed:',
            notificationMessage.type,
            error,
          );
          sendResponse({ ok: false });
        });
      return true;
    },
  );

  void ensureTransactionAlarm()
    .then(() => pollTransactionWatches())
    .catch(console.error);
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== TRANSACTION_ALARM) return;
    console.info('[notifications] transaction alarm fired');
    void pollTransactionWatches().catch((error) => {
      console.error('[notifications] transaction polling failed:', error);
    });
  });

  chrome.notifications.onClicked.addListener((id) => {
    if (id.startsWith('clorio_transaction_')) {
      void chrome.notifications.clear(id);
    }
  });
}

export async function showSoftwareUpdateNotification(): Promise<void> {
  await showLocalizedNotification(
    notificationId('software', 'update'),
    'notifications.software_update',
    {},
    1,
  );
}

export type { NotificationTransactionType };
