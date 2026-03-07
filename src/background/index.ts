import './sidepanel';

import type { AppMessage, SetUiModeResponse } from '@/messages/types';
import type {
  DeriveKeysResponse,
  SignPaymentResponse,
  ValidatePrivateKeyResponse,
  SignDelegationResponse,
  LedgerImportAccountResponse,
  LedgerSubmitTxResponse,
} from '@/messages/types';

import { handleSetUiMode, openExtension } from './sidepanel';

import {
  startKeepalive,
  stopKeepalive,
  handleImportAccount,
  handleSubmitPayment,
  handleSubmitDelegation,
} from './handlers/ledger';

import {
  handleDeriveKeys,
  handleSignPayment,
  handleValidatePrivateKey,
  handleSignDelegation,
} from './handlers/wallet';

type AnyResponse =
  | DeriveKeysResponse
  | SignPaymentResponse
  | ValidatePrivateKeyResponse
  | SignDelegationResponse
  | LedgerImportAccountResponse
  | LedgerSubmitTxResponse
  | SetUiModeResponse
  | { ok: true }
  | { error: string };

type MessageByType<T extends AppMessage['type']> = Extract<AppMessage, { type: T }>;

type HandlerEntry<T extends AppMessage['type'], R extends AnyResponse> = {
  async: boolean;
  handle: (
    msg: MessageByType<T>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (r: R) => void,
  ) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouterMap = { [T in AppMessage['type']]?: HandlerEntry<T, any> };

const handlers: RouterMap = {
  LEDGER_KEEPALIVE_START: {
    async: false,
    handle: () => startKeepalive(),
  },

  LEDGER_KEEPALIVE_END: {
    async: false,
    handle: () => stopKeepalive(),
  },

  LEDGER_IMPORT_ACCOUNT: {
    async: true,
    handle: (msg, _sender, sendResponse: (r: LedgerImportAccountResponse) => void) =>
      handleImportAccount(msg.payload, sendResponse),
  },

  LEDGER_SUBMIT_PAYMENT: {
    async: true,
    handle: (msg, _sender, sendResponse: (r: LedgerSubmitTxResponse) => void) =>
      handleSubmitPayment(msg.payload, sendResponse),
  },

  LEDGER_SUBMIT_DELEGATION: {
    async: true,
    handle: (msg, _sender, sendResponse: (r: LedgerSubmitTxResponse) => void) =>
      handleSubmitDelegation(msg.payload, sendResponse),
  },

  DERIVE_KEYS_FROM_MNEMONIC: {
    async: true,
    handle: (msg, _sender, sendResponse: (r: DeriveKeysResponse | { error: string }) => void) =>
      handleDeriveKeys(msg.payload, sendResponse),
  },

  SIGN_PAYMENT: {
    async: true,
    handle: (msg, _sender, sendResponse: (r: SignPaymentResponse | { error: string }) => void) =>
      handleSignPayment(msg.payload, sendResponse),
  },

  VALIDATE_PRIVATE_KEY: {
    async: false,
    handle: (msg, _sender, sendResponse: (r: ValidatePrivateKeyResponse) => void) =>
      handleValidatePrivateKey(msg.payload, sendResponse),
  },

  SIGN_DELEGATION: {
    async: true,
    handle: (msg, _sender, sendResponse: (r: SignDelegationResponse | { error: string }) => void) =>
      handleSignDelegation(msg.payload, sendResponse),
  },

  CLOSE_VIEW: {
    async: false,
    handle: () => {},
  },

  SET_UIMODE: {
    async: true,
    handle: (msg, sender, sendResponse: (r: SetUiModeResponse) => void) =>
      handleSetUiMode(msg.value, sender.tab?.id, sendResponse),
  },

  OPEN_EXTENSION: {
    async: true,
    handle: (_msg, _sender, sendResponse: (r: { ok: true }) => void) => {
      openExtension()
        .then(() => sendResponse({ ok: true }))
        .catch((e) => {
          console.warn('[background] openExtension failed:', e);
          sendResponse({ ok: true });
        });
    },
  },
};

function route(
  message: AppMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: AnyResponse) => void,
): boolean {
  const entry = handlers[message.type];

  if (!entry) {
    console.warn('[background] Unhandled message type:', message.type);
    return false;
  }

  (entry as HandlerEntry<typeof message.type, AnyResponse>).handle(
    message,
    sender,
    sendResponse,
  );

  return entry.async;
}

console.log('[background] Service Worker running');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] Extension installed/updated');
});

chrome.runtime.onMessage.addListener((message: AppMessage, sender, sendResponse) =>
  route(message, sender, sendResponse),
);
