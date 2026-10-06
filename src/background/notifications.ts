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
const LANGUAGE_STORAGE_KEY = 'clorio_language';
const TRANSACTION_ALARM = 'clorio_transaction_notifications';
const ICON_URL = 'icon-48.png';

type Locale = 'en' | 'es' | 'fr' | 'de';
type TransactionStatus = 'pending' | 'applied' | 'failed';
type NotificationKey =
  | 'notifications.dapp.request'
  | 'notifications.transaction.applied'
  | 'notifications.transaction.failed'
  | 'notifications.session.locked'
  | 'notifications.session.unlocked'
  | 'notifications.software_update';

const resources = { en, es, fr, de } as const;

export interface TransactionWatch extends NotificationTransaction {
  lastStatus: TransactionStatus;
}

export interface TransactionStatusResult {
  status: TransactionStatus;
}

export type TransactionStatusFetcher = (input: {
  apiUrl: string;
  hash: string;
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
  notification: { key: 'transaction.applied' | 'transaction.failed' } | null;
} {
  if (status === 'pending') {
    return { next: { ...watch, lastStatus: status }, notification: null };
  }

  return {
    next: null,
    notification: {
      key: status === 'applied' ? 'transaction.applied' : 'transaction.failed',
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
  if (typeof chrome === 'undefined' || !chrome.notifications?.create) return;

  await chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: ICON_URL,
    title: copy.title,
    message: copy.message,
    priority,
  });
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
  );
}

async function readWatches(): Promise<Record<string, TransactionWatch>> {
  const result = await chrome.storage.local.get(WATCHES_STORAGE_KEY);
  const value = result[WATCHES_STORAGE_KEY];
  return isRecord(value) ? (value as Record<string, TransactionWatch>) : {};
}

async function writeWatches(
  watches: Record<string, TransactionWatch>,
): Promise<void> {
  await chrome.storage.local.set({ [WATCHES_STORAGE_KEY]: watches });
}

export async function registerTransactionWatch(
  transaction: NotificationTransaction,
): Promise<void> {
  const watch: TransactionWatch = { ...transaction, lastStatus: 'pending' };
  const watches = await readWatches();
  watches[transactionWatchId(watch)] = watch;
  await writeWatches(watches);
}

const defaultFetchTransactionStatus: TransactionStatusFetcher = async ({
  apiUrl,
  hash,
}) => {
  const response = await fetch(
    `${apiUrl.replace(/\/$/, '')}/v1/mina/transaction/${encodeURIComponent(hash)}`,
  );
  if (!response.ok) throw new Error(`Transaction status: ${response.status}`);

  const body = (await response.json()) as unknown;
  const record = isRecord(body) && isRecord(body.data) ? body.data : body;
  const status = isRecord(record) ? record.status : undefined;
  if (status !== 'pending' && status !== 'applied' && status !== 'failed') {
    throw new Error('Unknown transaction status');
  }
  return { status };
};

export async function pollTransactionWatches(
  fetcher: TransactionStatusFetcher = defaultFetchTransactionStatus,
): Promise<void> {
  const watches = await readWatches();
  let changed = false;

  for (const [id, watch] of Object.entries(watches)) {
    try {
      const result = await fetcher({ apiUrl: watch.apiUrl, hash: watch.hash });
      const transition = transitionTransactionWatch(watch, result.status);
      if (!transition.next) {
        await showLocalizedNotification(
          notificationId('transaction', id),
          `notifications.${transition.notification?.key}` as NotificationKey,
          { hash: watch.hash.slice(0, 12) },
        );
        delete watches[id];
      } else {
        watches[id] = transition.next;
      }
      changed = true;
    } catch {
      // Keep failed network checks so the next alarm can retry them.
    }
  }

  if (changed) await writeWatches(watches);
}

async function handleNotificationMessage(message: AppMessage): Promise<void> {
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
      return;
    case 'SESSION_LOCKED':
      await showLocalizedNotification(
        notificationId('session', 'locked'),
        'notifications.session.locked',
      );
      return;
    case 'SESSION_UNLOCKED':
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
  if (typeof chrome === 'undefined') return;

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isNotificationMessage(message)) return false;
    void handleNotificationMessage(message as AppMessage);
    return false;
  });

  chrome.alarms.create(TRANSACTION_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 1,
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TRANSACTION_ALARM) void pollTransactionWatches();
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
