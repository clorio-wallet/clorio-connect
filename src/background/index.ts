import './sidepanel';

import type { AppMessage, SetUiModeResponse } from '@/messages/types';
import type {
  DeriveKeysResponse,
  SignPaymentResponse,
  ValidatePrivateKeyResponse,
  GetPrivateKeyResponse,
  SignDelegationResponse,
  LedgerImportAccountResponse,
  LedgerSubmitTxResponse,
  DappRpcResponse,
  DappGetPendingApprovalResponse,
  DappResolvePendingApprovalResponse,
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
import {
  broadcastAccountsChangedToConnectedTabs,
  broadcastChainChangedToConnectedTabs,
  handleDappRpcRequest,
  handleGetPendingDappApproval,
  handleResolveDappApproval,
  syncConnectedPermissionsToActiveWallet,
} from './handlers/dapp';
import { DAPP_NETWORK_ID_STORAGE_KEY } from '@/lib/dapp';
import { VaultManager } from '@/lib/vault-manager';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';
import { VAULT_STORAGE_KEY, isVaultData, type VaultData } from '@/lib/types/vault';

type AnyResponse =
  | DeriveKeysResponse
  | SignPaymentResponse
  | ValidatePrivateKeyResponse
  | GetPrivateKeyResponse
  | SignDelegationResponse
  | LedgerImportAccountResponse
  | LedgerSubmitTxResponse
  | SetUiModeResponse
  | DappRpcResponse
  | DappGetPendingApprovalResponse
  | DappResolvePendingApprovalResponse
  | { ok: true }
  | { error: string }
  | { result?: unknown; error?: { code: number; message: string } };

type MessageByType<T extends AppMessage['type']> = Extract<
  AppMessage,
  { type: T }
>;

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
    handle: (
      msg,
      _sender,
      sendResponse: (r: LedgerImportAccountResponse) => void,
    ) => handleImportAccount(msg.payload, sendResponse),
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
    handle: (
      msg,
      _sender,
      sendResponse: (r: DeriveKeysResponse | { error: string }) => void,
    ) => handleDeriveKeys(msg.payload, sendResponse),
  },

  SIGN_PAYMENT: {
    async: true,
    handle: (
      msg,
      _sender,
      sendResponse: (r: SignPaymentResponse | { error: string }) => void,
    ) => handleSignPayment(msg.payload, sendResponse),
  },

  VALIDATE_PRIVATE_KEY: {
    async: false,
    handle: (
      msg,
      _sender,
      sendResponse: (r: ValidatePrivateKeyResponse) => void,
    ) => handleValidatePrivateKey(msg.payload, sendResponse),
  },

  GET_PRIVATE_KEY: {
    async: true,
    handle: async (
      msg,
      _sender,
      sendResponse: (r: GetPrivateKeyResponse) => void,
    ) => {
      try {
        const { password, walletId } = msg.payload;

        // Get wallet info to check type
        const vault = await VaultManager.loadVault();
        if (!vault) {
          sendResponse({ error: 'No vault found' });
          return;
        }

        const wallet = vault.wallets.find((w) => w.id === walletId);
        if (!wallet) {
          sendResponse({ error: 'Wallet not found' });
          return;
        }

        if (wallet.type === 'ledger') {
          sendResponse({ error: 'Ledger wallets do not expose a private key' });
          return;
        }

        // Decrypt the secret (mnemonic or private key)
        const secret = await VaultManager.getPrivateKey(password, walletId);

        let privateKey: string;
        if (wallet.type === 'privateKey') {
          privateKey = secret.trim();
        } else {
          // For mnemonic wallets, derive the private key
          privateKey = await deriveMinaPrivateKey(
            secret,
            wallet.accountIndex ?? 0,
          );
        }

        sendResponse({ privateKey });
      } catch (error) {
        console.error('[background] GET_PRIVATE_KEY failed:', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to retrieve private key';
        sendResponse({ error: message });
      }
    },
  },

  GET_MNEMONIC: {
    async: true,
    handle: async (
      msg,
      _sender,
      sendResponse: (r: { data?: string; error?: string }) => void,
    ) => {
      try {
        const { password, walletId } = msg.payload;

        const vault = await VaultManager.loadVault();
        if (!vault) {
          sendResponse({ error: 'No vault found' });
          return;
        }

        const wallet = vault.wallets.find((w) => w.id === walletId);
        if (!wallet) {
          sendResponse({ error: 'Wallet not found' });
          return;
        }

        if (wallet.type !== 'mnemonic') {
          sendResponse({ error: 'Wallet is not a mnemonic wallet' });
          return;
        }

        const mnemonic = await VaultManager.getPrivateKey(password, walletId);
        sendResponse({ data: mnemonic.trim() });
      } catch (error) {
        console.error('[background] GET_MNEMONIC failed:', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to retrieve mnemonic';
        sendResponse({ error: message });
      }
    },
  },

  SIGN_DELEGATION: {
    async: true,
    handle: (
      msg,
      _sender,
      sendResponse: (r: SignDelegationResponse | { error: string }) => void,
    ) => handleSignDelegation(msg.payload, sendResponse),
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

  DAPP_RPC_REQUEST: {
    async: true,
    handle: (msg, sender, sendResponse: (r: DappRpcResponse) => void) => {
      // Validate that the message originates from a real content script tab,
      // not from an extension page or synthetic internal message.
      if (!sender.tab?.id || sender.tab.url === undefined) {
        sendResponse({
          result: undefined,
          error: { code: -32603, message: 'Invalid request origin.' },
        });
        return;
      }
      try {
        const senderOrigin = new URL(sender.tab.url).origin;
        if (senderOrigin !== msg.payload.site.origin) {
          sendResponse({
            result: undefined,
            error: { code: -32603, message: 'Origin mismatch.' },
          });
          return;
        }
      } catch {
        sendResponse({
          result: undefined,
          error: { code: -32603, message: 'Invalid sender URL.' },
        });
        return;
      }
      handleDappRpcRequest(msg.payload, sendResponse);
    },
  },

  DAPP_GET_PENDING_APPROVAL: {
    async: true,
    handle: (
      _msg,
      _sender,
      sendResponse: (r: DappGetPendingApprovalResponse) => void,
    ) => handleGetPendingDappApproval(sendResponse),
  },

  DAPP_RESOLVE_PENDING_APPROVAL: {
    async: true,
    handle: (
      msg,
      _sender,
      sendResponse: (r: DappResolvePendingApprovalResponse) => void,
    ) => handleResolveDappApproval(msg.payload, sendResponse),
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

console.log(
  '[background] Service Worker running (mina-signer will load on first use)',
);

chrome.runtime.onInstalled.addListener(() => {
  console.log('[background] Extension installed/updated');
});

chrome.runtime.onMessage.addListener(
  (message: AppMessage, sender, sendResponse) =>
    route(message, sender, sendResponse),
);

function getActiveWalletPublicKey(vault: VaultData | null | undefined): string | null {
  if (!vault) {
    return null;
  }

  const activeWallet = vault.wallets.find((wallet) => wallet.id === vault.activeWalletId);
  return activeWallet?.publicKey ?? null;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  const networkChange = changes[DAPP_NETWORK_ID_STORAGE_KEY];
  if (
    networkChange &&
    typeof networkChange.newValue === 'string' &&
    networkChange.oldValue !== networkChange.newValue
  ) {
    void broadcastChainChangedToConnectedTabs();
  }

  const vaultChange = changes[VAULT_STORAGE_KEY];
  if (!vaultChange) {
    return;
  }

  const oldVault = isVaultData(vaultChange.oldValue) ? vaultChange.oldValue : null;
  const newVault = isVaultData(vaultChange.newValue) ? vaultChange.newValue : null;

  const previousActiveKey = getActiveWalletPublicKey(oldVault);
  const nextActiveKey = getActiveWalletPublicKey(newVault);

  if (previousActiveKey === nextActiveKey) {
    return;
  }

  void (async () => {
    await syncConnectedPermissionsToActiveWallet();
    await broadcastAccountsChangedToConnectedTabs();
  })();
});
