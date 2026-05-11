import type { WalletEntry } from '@/lib/types/vault';
import type {
  DappGetPendingApprovalResponse,
  DappResolvePendingApprovalResponse,
  DappRpcResponse,
} from '@/messages/types';

import {
  DAPP_APPROVAL_REQUESTED_MESSAGE,
  DAPP_ERROR_CODES,
  DAPP_NETWORK_ID_STORAGE_KEY,
  DAPP_PENDING_APPROVAL_STORAGE_KEY,
  DAPP_PERMISSIONS_STORAGE_KEY,
  DAPP_PROVIDER_EVENT_MESSAGE,
  createDappError,
  DappAddChainParams,
  DappCreateNullifierParams,
  DappPendingApproval,
  DappPermissions,
  DappProviderError,
  DappRpcPayload,
  DappSignFieldsParams,
  DappSignJsonMessageParams,
  DappSendPaymentParams,
  DappSendStakeDelegationParams,
  DappSendTransactionParams,
  DappSignMessageParams,
  DappSwitchChainParams,
  DappVerifyFieldsParams,
  DappVerifyMessageParams,
  DappNetworkId,
  isRecord,
} from '@/lib/dapp';
import {
  DEFAULT_NETWORKS,
  DAPP_CUSTOM_NETWORKS_STORAGE_KEY,
  CustomDappNetworkConfig,
  labelToMinaId,
  minaIdToLabel,
  normalizeNetworkUrl,
  toCustomNetworkLabel,
} from '@/lib/networks';
import { sessionStorage, storage } from '@/lib/storage';
import { toNano } from '@/lib/utils';
import { VaultManager } from '@/lib/vault-manager';

import { openExtension } from '../sidepanel';
import { getPrivateKeyFromVault } from './wallet';
import { getSignerClient } from '../mina-client-manager';

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_PAYMENT_FEE = '0.1';
const DAPP_LAST_SIGNED_MESSAGE_STORAGE_KEY = 'clorio_dapp_last_signed_message';
const GRAPHQL_ENDPOINTS: Record<DappNetworkId, string> = {
  mainnet:
    import.meta.env.VITE_MAINNET_GRAPHQL_URL ||
    'https://api.minascan.io/node/mainnet/v1/graphql',
  devnet:
    import.meta.env.VITE_DEVNET_GRAPHQL_URL ||
    'https://api.minascan.io/node/devnet/v1/graphql',
};
const REST_API_BASE = (
  import.meta.env.VITE_API_URL as string | undefined
)?.replace(/\/$/, '');

type PendingRequestState = {
  request: DappRpcPayload;
  preview: DappPendingApproval;
  resolve: (response: DappRpcResponse) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingRequests = new Map<string, PendingRequestState>();
let activePendingRequestId: string | null = null;

function toResponse(result: unknown): DappRpcResponse {
  return { result };
}

function toErrorResponse(error: DappProviderError): DappRpcResponse {
  return { error };
}

function asDappError(error: unknown): DappProviderError {
  if (
    isRecord(error) &&
    typeof error.code === 'number' &&
    typeof error.message === 'string'
  ) {
    return error as unknown as DappProviderError;
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  return createDappError(DAPP_ERROR_CODES.internalError, message);
}

async function getCurrentNetworkId(): Promise<DappNetworkId> {
  const stored = await storage.get<string>(DAPP_NETWORK_ID_STORAGE_KEY);
  return stored || 'mainnet';
}

async function setCurrentNetworkId(networkId: DappNetworkId): Promise<void> {
  await storage.set(DAPP_NETWORK_ID_STORAGE_KEY, networkId);
}

async function loadCustomNetworks(): Promise<Record<string, CustomDappNetworkConfig>> {
  return (
    (await storage.get<Record<string, CustomDappNetworkConfig>>(
      DAPP_CUSTOM_NETWORKS_STORAGE_KEY,
    )) ?? {}
  );
}

async function saveCustomNetworks(
  networks: Record<string, CustomDappNetworkConfig>,
): Promise<void> {
  await storage.set(DAPP_CUSTOM_NETWORKS_STORAGE_KEY, networks);
}

async function resolveNetworkLabel(requested: string): Promise<string | null> {
  const builtIn = minaIdToLabel(requested);
  if (builtIn) {
    return builtIn;
  }

  const customNetworks = await loadCustomNetworks();
  const customMatch = Object.values(customNetworks).find(
    (network) => network.networkID === requested || network.label === requested,
  );

  return customMatch?.label ?? null;
}

async function resolveProviderNetworkId(networkLabel: string): Promise<string> {
  const builtInNetworkId =
    networkLabel === 'mainnet' || networkLabel === 'devnet'
      ? labelToMinaId(networkLabel)
      : null;

  if (builtInNetworkId) {
    return builtInNetworkId;
  }

  const customNetworks = await loadCustomNetworks();
  return customNetworks[networkLabel]?.networkID ?? labelToMinaId(networkLabel);
}

async function getGraphqlEndpointForNetwork(networkId: string): Promise<string> {
  if (networkId === 'mainnet') {
    return GRAPHQL_ENDPOINTS.mainnet;
  }

  if (networkId === 'devnet') {
    return GRAPHQL_ENDPOINTS.devnet;
  }

  const customNetworks = await loadCustomNetworks();
  const customNetwork = customNetworks[networkId];
  if (!customNetwork?.epochUrl) {
    throw createDappError(
      DAPP_ERROR_CODES.unsupportedChain,
      `No GraphQL endpoint configured for network ${networkId}.`,
    );
  }

  return customNetwork.epochUrl;
}

function normalizeSwitchChainParams(params: unknown): DappSwitchChainParams {
  if (typeof params === 'string') {
    return { networkID: params };
  }

  if (!isRecord(params)) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'switchChain requires a networkID.',
    );
  }

  const requested =
    typeof params.networkID === 'string'
      ? params.networkID
      : typeof params.chainId === 'string'
        ? params.chainId
        : null;

  if (!requested) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'switchChain requires a networkID.',
    );
  }

  return { networkID: requested };
}

function normalizeAddChainParams(params: unknown): DappAddChainParams {
  if (
    !isRecord(params) ||
    typeof params.url !== 'string' ||
    typeof params.name !== 'string'
  ) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'addChain requires a name and url.',
    );
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeNetworkUrl(params.url);
  } catch {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'addChain requires a valid URL.',
    );
  }

  return {
    url: normalizedUrl,
    name: params.name.trim(),
    networkID:
      typeof params.networkID === 'string'
        ? params.networkID
        : typeof params.chainId === 'string'
          ? params.chainId
          : undefined,
  };
}

function removeJsonQuotes(json: string): string {
  return JSON.stringify(JSON.parse(json), null, 2).replace(/"(\S+)"\s*:/gm, '$1:');
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchPendingNonce(publicKey: string): Promise<number> {
  if (!REST_API_BASE) {
    return 0;
  }

  const [accountResponse, mempoolResponse] = await Promise.all([
    fetch(`${REST_API_BASE}/v1/mina/accounts/${publicKey}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    }).then((response) => response.json() as Promise<{ nonce?: number }>),
    fetch(`${REST_API_BASE}/v1/mina/mempool/${publicKey}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((response) => response.json() as Promise<{ mempool?: unknown[] }>)
      .catch(() => ({ mempool: [] })),
  ]);

  const accountNonce =
    typeof accountResponse?.nonce === 'number' ? accountResponse.nonce : 0;
  const mempool = Array.isArray(mempoolResponse?.mempool)
    ? (mempoolResponse.mempool.filter(isRecord) as Record<string, unknown>[])
    : [];

  const outgoingCount = mempool.filter((tx) => {
    const sender =
      typeof tx.sender === 'string'
        ? tx.sender
        : typeof tx.from === 'string'
          ? tx.from
          : typeof tx.fromAddress === 'string'
            ? tx.fromAddress
            : undefined;
    return sender === publicKey;
  }).length;

  return accountNonce + outgoingCount;
}

async function getActiveWallet(): Promise<WalletEntry> {
  const wallet = await VaultManager.getActiveWallet();
  if (!wallet) {
    throw createDappError(
      DAPP_ERROR_CODES.notConnected,
      'Create or import a wallet before connecting to a dApp.',
    );
  }
  return wallet;
}

async function getActiveSoftwareWallet(): Promise<WalletEntry> {
  const wallet = await getActiveWallet();
  if (wallet.type === 'ledger') {
    throw createDappError(
      DAPP_ERROR_CODES.unsupportedMethod,
      'Switch to a software wallet to use zkApp signing in the MVP.',
    );
  }
  return wallet;
}

async function loadPermissions(): Promise<DappPermissions> {
  return (
    (await storage.get<DappPermissions>(DAPP_PERMISSIONS_STORAGE_KEY)) ?? {}
  );
}

async function savePermissions(permissions: DappPermissions): Promise<void> {
  await storage.set(DAPP_PERMISSIONS_STORAGE_KEY, permissions);
}

export async function syncConnectedPermissionsToActiveWallet(): Promise<void> {
  const activeWallet = await VaultManager.getActiveWallet();
  const permissions = await loadPermissions();

  if (!activeWallet || activeWallet.type === 'ledger') {
    if (Object.keys(permissions).length > 0) {
      await savePermissions({});
    }
    return;
  }

  const nextPermissions = Object.fromEntries(
    Object.entries(permissions).map(([origin, permission]) => [
      origin,
      {
        ...permission,
        walletId: activeWallet.id,
        publicKey: activeWallet.publicKey,
      },
    ]),
  );

  await savePermissions(nextPermissions);
}

export async function broadcastAccountsChangedToConnectedTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) {
        return;
      }

      let origin: string;
      try {
        const url = new URL(tab.url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return;
        }
        origin = url.origin;
      } catch {
        return;
      }

      const accounts = await getConnectedAccounts(origin);
      await chrome.tabs
        .sendMessage(tab.id, {
          type: DAPP_PROVIDER_EVENT_MESSAGE,
          eventName: 'accountsChanged',
          params: accounts,
        })
        .catch(() => undefined);
    }),
  );
}

export async function broadcastChainChangedToConnectedTabs(): Promise<void> {
  const networkID = await resolveProviderNetworkId(await getCurrentNetworkId());
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) {
        return;
      }

      try {
        const url = new URL(tab.url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return;
        }
      } catch {
        return;
      }

      await chrome.tabs
        .sendMessage(tab.id, {
          type: DAPP_PROVIDER_EVENT_MESSAGE,
          eventName: 'chainChanged',
          params: { networkID },
        })
        .catch(() => undefined);
    }),
  );
}

type LastSignedMessage = {
  origin: string;
  publicKey: string;
  data: string;
  signature: {
    field: string;
    scalar: string;
  };
};

async function saveLastSignedMessage(message: LastSignedMessage): Promise<void> {
  await storage.set(DAPP_LAST_SIGNED_MESSAGE_STORAGE_KEY, message);
}

async function loadLastSignedMessage(): Promise<LastSignedMessage | undefined> {
  return storage.get<LastSignedMessage>(DAPP_LAST_SIGNED_MESSAGE_STORAGE_KEY);
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Invalid zkApp origin.',
    );
  }
}

function buildApprovalSummary(request: DappRpcPayload) {
  if (request.method === 'mina_signMessage') {
    const params = request.params as DappSignMessageParams | undefined;
    return {
      message: typeof params?.message === 'string' ? params.message : undefined,
    };
  }

  if (request.method === 'mina_sendPayment') {
    const params = request.params as DappSendPaymentParams | undefined;
    return {
      amount: params?.amount,
      fee: params?.fee,
      to: typeof params?.to === 'string' ? params.to : undefined,
      memo: typeof params?.memo === 'string' ? params.memo : undefined,
      nonce:
        typeof params?.nonce === 'number' && Number.isFinite(params.nonce)
          ? params.nonce
          : undefined,
    };
  }

  if (request.method === 'mina_sendStakeDelegation') {
    const params = request.params as DappSendStakeDelegationParams | undefined;
    return {
      fee: params?.fee,
      to: typeof params?.to === 'string' ? params.to : undefined,
      memo: typeof params?.memo === 'string' ? params.memo : undefined,
      nonce:
        typeof params?.nonce === 'number' && Number.isFinite(params.nonce)
          ? params.nonce
          : undefined,
    };
  }

  if (request.method === 'mina_sendTransaction') {
    const params = request.params as DappSendTransactionParams | undefined;
    return {
      fee: params?.feePayer?.fee,
      memo: params?.feePayer?.memo,
      nonce:
        typeof params?.nonce === 'number' && Number.isFinite(params.nonce)
          ? params.nonce
          : undefined,
      onlySign: params?.onlySign === true,
    };
  }

  if (request.method === 'mina_signFields') {
    const params = request.params as DappSignFieldsParams | undefined;
    const message = Array.isArray(params?.message) ? params.message : [];
    return { fields: message.slice(0, 10) };
  }

  if (request.method === 'mina_createNullifier') {
    const params = request.params as DappCreateNullifierParams | undefined;
    const message = Array.isArray(params?.message) ? params.message : [];
    return { fields: message.slice(0, 10) };
  }

  if (request.method === 'mina_signJsonMessage') {
    const params = request.params as DappSignJsonMessageParams | undefined;
    const message = Array.isArray(params?.message) ? params.message : [];
    return { entries: message.slice(0, 5) };
  }

  if (request.method === 'mina_switchChain') {
    const params = request.params as DappSwitchChainParams | undefined;
    return { networkID: params?.networkID };
  }

  if (request.method === 'mina_addChain') {
    const params = normalizeAddChainParams(request.params);
    return {
      networkID: params.networkID,
      name: params.name,
      url: params.url,
    };
  }

  return undefined;
}

async function persistPendingApproval(
  preview: DappPendingApproval,
): Promise<void> {
  await sessionStorage.set(DAPP_PENDING_APPROVAL_STORAGE_KEY, preview);
}

async function clearPendingApprovalStorage(): Promise<void> {
  await sessionStorage.remove(DAPP_PENDING_APPROVAL_STORAGE_KEY);
}

function finalizePendingRequest(
  requestId: string,
  response: DappRpcResponse,
): void {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    return;
  }

  clearTimeout(pending.timeoutId);
  pendingRequests.delete(requestId);
  if (activePendingRequestId === requestId) {
    activePendingRequestId = null;
  }

  void clearPendingApprovalStorage();
  pending.resolve(response);
}

async function enqueueApproval(
  request: DappRpcPayload,
  wallet: WalletEntry,
): Promise<DappRpcResponse> {
  if (activePendingRequestId && activePendingRequestId !== request.id) {
    return toErrorResponse(
      createDappError(
        DAPP_ERROR_CODES.pendingRequest,
        'Another zkApp request is already pending.',
      ),
    );
  }

  const preview: DappPendingApproval = {
    requestId: request.id,
    method: request.method,
    site: request.site,
    account: {
      walletId: wallet.id,
      publicKey: wallet.publicKey,
      name: wallet.name,
      type: wallet.type === 'ledger' ? 'ledger' : 'software',
    },
    networkId: await getCurrentNetworkId(),
    createdAt: Date.now(),
    summary: buildApprovalSummary(request),
  };

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      finalizePendingRequest(
        request.id,
        toErrorResponse(
          createDappError(
            DAPP_ERROR_CODES.userRejected,
            'The request timed out before it was approved.',
          ),
        ),
      );
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(request.id, {
      request,
      preview,
      resolve,
      timeoutId,
    });
    activePendingRequestId = request.id;

    void (async () => {
      try {
        await persistPendingApproval(preview);
        await openExtension();
        await chrome.runtime
          .sendMessage({ type: DAPP_APPROVAL_REQUESTED_MESSAGE })
          .catch(() => undefined);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(
          '[dapp] Failed to open extension for approval:',
          errorMsg,
          error,
        );
        // Note: Badge notification will be shown as fallback if sidepanel couldn't open
        finalizePendingRequest(request.id, toErrorResponse(asDappError(error)));
      }
    })();
  });
}

function normalizeSignMessageParams(params: unknown): DappSignMessageParams {
  if (!isRecord(params) || typeof params.message !== 'string') {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected a message string to sign.',
    );
  }

  return { message: params.message };
}

function normalizeVerifyMessageParams(
  params: unknown,
  fallback?: { data?: string; publicKey?: string },
): DappVerifyMessageParams {
  if (
    isRecord(params) &&
    typeof params.data === 'string' &&
    typeof params.publicKey === 'string' &&
    isRecord(params.signature) &&
    typeof params.signature.field === 'string' &&
    typeof params.signature.scalar === 'string'
  ) {
    return {
      data: params.data,
      publicKey: params.publicKey,
      signature: {
        field: params.signature.field,
        scalar: params.signature.scalar,
      },
    };
  }

  if (
    isRecord(params) &&
    typeof params.field === 'string' &&
    typeof params.scalar === 'string' &&
    fallback?.data &&
    fallback.publicKey
  ) {
    return {
      data: fallback.data,
      publicKey: fallback.publicKey,
      signature: {
        field: params.field,
        scalar: params.scalar,
      },
    };
  }

  if (isRecord(params) && typeof params.message === 'string') {
    const signature = isRecord(params.signature) ? params.signature : undefined;
    const publicKey =
      typeof params.publicKey === 'string'
        ? params.publicKey
        : typeof params.address === 'string'
          ? params.address
          : undefined;

    if (
      publicKey &&
      signature &&
      typeof signature.field === 'string' &&
      typeof signature.scalar === 'string'
    ) {
      return {
        data: params.message,
        publicKey,
        signature: {
          field: signature.field,
          scalar: signature.scalar,
        },
      };
    }
  }

  if (Array.isArray(params) && params.length >= 3) {
    const [data, signature, publicKey] = params;
    if (
      typeof data === 'string' &&
      typeof publicKey === 'string' &&
      isRecord(signature) &&
      typeof signature.field === 'string' &&
      typeof signature.scalar === 'string'
    ) {
      return {
        data,
        publicKey,
        signature: {
          field: signature.field,
          scalar: signature.scalar,
        },
      };
    }
  }

  if (
    !isRecord(params) ||
    (typeof params.data !== 'string' && typeof fallback?.data !== 'string') ||
    (typeof params.publicKey !== 'string' && typeof fallback?.publicKey !== 'string') ||
    !isRecord(params.signature) ||
    typeof params.signature.field !== 'string' ||
    typeof params.signature.scalar !== 'string'
  ) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected signed message payload with data, publicKey, and signature.',
    );
  }

  return {
    data:
      typeof params.data === 'string'
        ? params.data
        : (fallback?.data as string),
    publicKey:
      typeof params.publicKey === 'string'
        ? params.publicKey
        : (fallback?.publicKey as string),
    signature: {
      field: params.signature.field,
      scalar: params.signature.scalar,
    },
  };
}

function normalizeSignFieldsParams(params: unknown): DappSignFieldsParams {
  if (!isRecord(params) || !Array.isArray(params.message)) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected a message array for signFields.',
    );
  }

  const message = params.message.filter(
    (value): value is string | number =>
      typeof value === 'string' || typeof value === 'number',
  );

  return { message };
}

function normalizeVerifyFieldsParams(params: unknown): DappVerifyFieldsParams {
  if (!isRecord(params)) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected verifyFields payload.',
    );
  }

  const messageSource = Array.isArray(params.message)
    ? params.message
    : Array.isArray(params.data)
      ? params.data
      : null;

  if (
    !messageSource ||
    typeof params.publicKey !== 'string' ||
    !isRecord(params.signature) ||
    typeof params.signature.field !== 'string' ||
    typeof params.signature.scalar !== 'string'
  ) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected publicKey, data, and signature for verifyFields.',
    );
  }

  const message = messageSource.filter(
    (value): value is string | number =>
      typeof value === 'string' || typeof value === 'number',
  );

  return {
    data: message,
    publicKey: params.publicKey,
    signature: {
      field: params.signature.field,
      scalar: params.signature.scalar,
    },
  };
}

function normalizeCreateNullifierParams(
  params: unknown,
): DappCreateNullifierParams {
  return normalizeSignFieldsParams(params);
}

function normalizeSignJsonMessageParams(
  params: unknown,
): DappSignJsonMessageParams {
  if (!isRecord(params) || !Array.isArray(params.message)) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected a JSON message array to sign.',
    );
  }

  return {
    message: params.message
      .filter(
        (entry): entry is { label: string; value: string } =>
          isRecord(entry) &&
          typeof entry.label === 'string' &&
          typeof entry.value === 'string',
      )
      .map((entry) => ({ label: entry.label, value: entry.value })),
  };
}

function normalizeSendPaymentParams(params: unknown): DappSendPaymentParams {
  if (!isRecord(params) || typeof params.to !== 'string') {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected payment parameters with a recipient.',
    );
  }

  if (typeof params.amount !== 'number' && typeof params.amount !== 'string') {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected an amount for the payment.',
    );
  }

  return {
    to: params.to,
    amount: params.amount,
    fee:
      typeof params.fee === 'number' || typeof params.fee === 'string'
        ? params.fee
        : undefined,
    memo: typeof params.memo === 'string' ? params.memo : undefined,
    nonce:
      typeof params.nonce === 'number' && Number.isFinite(params.nonce)
        ? params.nonce
        : undefined,
    from: typeof params.from === 'string' ? params.from : undefined,
  };
}

function normalizeStakeDelegationParams(
  params: unknown,
): DappSendStakeDelegationParams {
  if (!isRecord(params) || typeof params.to !== 'string') {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected delegation parameters with a validator address.',
    );
  }

  return {
    to: params.to,
    fee:
      typeof params.fee === 'number' || typeof params.fee === 'string'
        ? params.fee
        : undefined,
    memo: typeof params.memo === 'string' ? params.memo : undefined,
    nonce:
      typeof params.nonce === 'number' && Number.isFinite(params.nonce)
        ? params.nonce
        : undefined,
    from: typeof params.from === 'string' ? params.from : undefined,
  };
}

function normalizeSendTransactionParams(
  params: unknown,
): DappSendTransactionParams {
  if (!isRecord(params) || !('transaction' in params)) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Expected a zkApp transaction payload.',
    );
  }

  return {
    transaction: params.transaction,
    feePayer: isRecord(params.feePayer)
      ? {
          fee:
            typeof params.feePayer.fee === 'number' ||
            typeof params.feePayer.fee === 'string'
              ? params.feePayer.fee
              : undefined,
          memo:
            typeof params.feePayer.memo === 'string'
              ? params.feePayer.memo
              : undefined,
        }
      : undefined,
    nonce:
      typeof params.nonce === 'number' && Number.isFinite(params.nonce)
        ? params.nonce
        : undefined,
    onlySign: params.onlySign === true,
  };
}

async function ensureApprovedOrigin(
  origin: string,
  wallet: WalletEntry,
): Promise<void> {
  const permissions = await loadPermissions();
  const permission = permissions[origin];

  if (
    !permission ||
    permission.walletId !== wallet.id ||
    permission.publicKey !== wallet.publicKey
  ) {
    throw createDappError(
      DAPP_ERROR_CODES.notConnected,
      'Connect this site before requesting a signature.',
    );
  }
}

async function performConnectApproval(
  request: DappRpcPayload,
): Promise<string[]> {
  const origin = normalizeOrigin(request.site.origin);
  const wallet = await getActiveSoftwareWallet();
  const permissions = await loadPermissions();

  permissions[origin] = {
    origin,
    walletId: wallet.id,
    publicKey: wallet.publicKey,
    grantedAt: Date.now(),
  };

  await savePermissions(permissions);
  await broadcastAccountsChangedToConnectedTabs();
  return [wallet.publicKey];
}

async function performMessageSignature(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const origin = normalizeOrigin(request.site.origin);
  const wallet = await getActiveSoftwareWallet();
  await ensureApprovedOrigin(origin, wallet);

  if (!password) {
    throw createDappError(
      DAPP_ERROR_CODES.walletLocked,
      'Unlock Clorio Connect before signing.',
    );
  }

  const { message } = normalizeSignMessageParams(request.params);
  const privateKey = await getPrivateKeyFromVault(password, wallet.id);
  const client = await getSignerClient();
  const signed = client.signMessage(message, privateKey) as {
    data: string;
    publicKey: string;
    signature: { field: string; scalar: string };
  };

  await saveLastSignedMessage({
    origin,
    publicKey: signed.publicKey,
    data: signed.data,
    signature: signed.signature,
  });

  return signed;
}

async function performMessageVerification(
  request: DappRpcPayload,
): Promise<boolean> {
  const origin = normalizeOrigin(request.site.origin);
  const permissions = await loadPermissions();
  const lastSigned = await loadLastSignedMessage();
  const params = normalizeVerifyMessageParams(request.params, {
    publicKey: permissions[origin]?.publicKey ?? lastSigned?.publicKey,
    data: lastSigned?.origin === origin ? lastSigned.data : undefined,
  });
  const client = await getSignerClient();
  return client.verifyMessage(params);
}

async function performFieldVerification(
  request: DappRpcPayload,
): Promise<boolean> {
  const params = normalizeVerifyFieldsParams(request.params);
  const client = await getSignerClient();
  return client.verifyFields({
    data: (params.data ?? []).map((value) => BigInt(value)),
    publicKey: params.publicKey,
    signature: params.signature,
  });
}

async function performFieldSignature(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const { privateKey, client } = await getUnlockedWalletContext(request, password);
  const { message } = normalizeSignFieldsParams(request.params);
  return client.signFields(message.map((value) => BigInt(value)), privateKey);
}

async function performJsonMessageSignature(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const origin = normalizeOrigin(request.site.origin);
  const { privateKey, client } = await getUnlockedWalletContext(request, password);
  const { message } = normalizeSignJsonMessageParams(request.params);
  const signed = client.signMessage(JSON.stringify(message), privateKey) as {
    data: string;
    publicKey: string;
    signature: { field: string; scalar: string };
  };

  await saveLastSignedMessage({
    origin,
    publicKey: signed.publicKey,
    data: signed.data,
    signature: signed.signature,
  });

  return signed;
}

async function performCreateNullifier(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const { privateKey, client } = await getUnlockedWalletContext(request, password);
  const { message } = normalizeCreateNullifierParams(request.params);
  return client.createNullifier(
    message.map((value) => BigInt(value)),
    privateKey,
  );
}

async function performAddChain(
  request: DappRpcPayload,
): Promise<{ networkID: string; name: string }> {
  const params = normalizeAddChainParams(request.params);
  const builtInMatch = Object.values(DEFAULT_NETWORKS).find(
    (network) => network.epochUrl === params.url || network.name === params.name,
  );

  if (builtInMatch) {
    await setCurrentNetworkId(builtInMatch.label);
    return {
      networkID: labelToMinaId(builtInMatch.label),
      name: builtInMatch.name,
    };
  }

  const customNetworks = await loadCustomNetworks();

  const existing = Object.values(customNetworks).find(
    (network) => network.epochUrl === params.url || network.name === params.name,
  );

  const label = existing?.label ?? toCustomNetworkLabel(params.name);
  const networkID = params.networkID ?? existing?.networkID ?? labelToMinaId(label);
  const networkFamily = networkID.toLowerCase().includes('mainnet')
    ? 'mainnet'
    : 'testnet';

  const nextNetwork: CustomDappNetworkConfig = {
    label,
    name: params.name,
    network: networkFamily,
    epochUrl: params.url,
    explorerUrl: existing?.explorerUrl ?? params.url,
    networkID,
    isCustom: true,
    addedAt: existing?.addedAt ?? Date.now(),
  };

  if (
    !existing ||
    existing.epochUrl !== nextNetwork.epochUrl ||
    existing.name !== nextNetwork.name ||
    existing.networkID !== nextNetwork.networkID
  ) {
    customNetworks[label] = nextNetwork;
    await saveCustomNetworks(customNetworks);
  }

  await setCurrentNetworkId(label);

  return {
    networkID,
    name: params.name,
  };
}

async function getUnlockedWalletContext(
  request: DappRpcPayload,
  password?: string,
) {
  const origin = normalizeOrigin(request.site.origin);
  const wallet = await getActiveSoftwareWallet();
  await ensureApprovedOrigin(origin, wallet);

  if (!password) {
    throw createDappError(
      DAPP_ERROR_CODES.walletLocked,
      'Unlock Clorio Connect before signing.',
    );
  }

  const privateKey = await getPrivateKeyFromVault(password, wallet.id);
  const client = await getSignerClient();
  return { wallet, privateKey, client };
}

async function performSendPayment(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const { wallet, privateKey, client } =
    await getUnlockedWalletContext(request, password);
  const params = normalizeSendPaymentParams(request.params);

  if (params.from && params.from !== wallet.publicKey) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'The requested sender does not match the connected account.',
    );
  }

  if (!params.fee) {
    console.warn(
      '[dapp] Payment request missing fee, using default network fee fallback',
      { origin: request.site.origin, to: params.to, amount: params.amount },
    );
  }

  if (!REST_API_BASE) {
    throw createDappError(
      DAPP_ERROR_CODES.internalError,
      'Payment broadcast is not configured.',
    );
  }

  const nonce = params.nonce ?? (await fetchPendingNonce(wallet.publicKey));
  const input = {
    from: wallet.publicKey,
    to: params.to,
    amount: toNano(params.amount),
    fee: toNano(params.fee ?? DEFAULT_PAYMENT_FEE),
    nonce: nonce.toString(),
    memo: params.memo ?? '',
  };

  const signed = client.signPayment(input, privateKey) as {
    signature: unknown;
  };
  const result = await postJson<{ hash?: string; id?: string }>(
    `${REST_API_BASE}/v1/mina/transaction`,
    { input, signature: signed.signature },
  );

  return {
    hash: result.hash ?? result.id,
    id: result.id ?? result.hash,
  };
}

async function performSendStakeDelegation(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const { wallet, privateKey, client } =
    await getUnlockedWalletContext(request, password);
  const params = normalizeStakeDelegationParams(request.params);

  if (params.from && params.from !== wallet.publicKey) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'The requested sender does not match the connected account.',
    );
  }

  if (!params.fee) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'A fee is required for delegations.',
    );
  }

  if (!REST_API_BASE) {
    throw createDappError(
      DAPP_ERROR_CODES.internalError,
      'Delegation broadcast is not configured.',
    );
  }

  const nonce = params.nonce ?? (await fetchPendingNonce(wallet.publicKey));
  const input = {
    from: wallet.publicKey,
    to: params.to,
    fee: toNano(params.fee),
    nonce: nonce.toString(),
    memo: params.memo ?? '',
  };

  const signed = client.signStakeDelegation(input, privateKey) as {
    signature: unknown;
  };
  const result = await postJson<{ hash?: string; id?: string }>(
    `${REST_API_BASE}/v1/mina/transaction/delegation`,
    { input, signature: signed.signature },
  );

  return {
    hash: result.hash ?? result.id,
    id: result.id ?? result.hash,
  };
}

function readNestedString(
  value: Record<string, unknown>,
  path: string[],
): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : undefined;
}

function readNestedNumber(
  value: Record<string, unknown>,
  path: string[],
): number | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  if (typeof current === 'number' && Number.isFinite(current)) {
    return current;
  }

  if (typeof current === 'string' && current.trim().length > 0) {
    const parsed = Number(current);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

async function performTransactionSignature(
  request: DappRpcPayload,
  password?: string,
): Promise<unknown> {
  const { wallet, privateKey, client } =
    await getUnlockedWalletContext(request, password);

  const params = normalizeSendTransactionParams(request.params);

  const transaction =
    typeof params.transaction === 'string'
      ? JSON.parse(params.transaction)
      : params.transaction;

  if (!isRecord(transaction)) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Invalid zkApp transaction payload.',
    );
  }

  const existingFeePayer = readNestedString(transaction, [
    'feePayer',
    'body',
    'publicKey',
  ]);
  if (existingFeePayer && existingFeePayer !== wallet.publicKey) {
    throw createDappError(
      DAPP_ERROR_CODES.unsupportedMethod,
      'Custom fee payers are not supported in the MVP yet.',
    );
  }

  const fee =
    params.feePayer?.fee !== undefined
      ? toNano(params.feePayer.fee)
      : readNestedString(transaction, ['feePayer', 'body', 'fee']);
  const nonce =
    params.nonce ??
    readNestedNumber(transaction, ['feePayer', 'body', 'nonce']);

  if (!fee) {
    throw createDappError(
      DAPP_ERROR_CODES.invalidParams,
      'Fee payer fee is required for zkApp signing.',
    );
  }

  const memo =
    params.feePayer?.memo ??
    readNestedString(transaction, ['feePayer', 'body', 'memo']) ??
    '';

  const resolvedNonce = nonce ?? (await fetchPendingNonce(wallet.publicKey));
  const signed = client.signTransaction(
    {
      zkappCommand: transaction,
      feePayer: {
        feePayer: wallet.publicKey,
        fee,
        nonce: resolvedNonce,
        memo,
      },
    },
    privateKey,
  ) as {
    data: {
      zkappCommand: unknown;
    };
  };

  if (params.onlySign) {
    return {
      hash: '',
      signedData: JSON.stringify(signed.data),
    };
  }

  const query = `mutation {
  sendZkapp(input: {
    zkappCommand: ${removeJsonQuotes(JSON.stringify(signed.data.zkappCommand))}
  }) {
    zkapp {
      hash
      id
      failureReason {
        failures
        index
      }
    }
  }

  if (
    isRecord(params) &&
    typeof params.data === 'string' &&
    isRecord(params.signature) &&
    typeof params.signature.field === 'string' &&
    typeof params.signature.scalar === 'string' &&
    typeof fallback?.publicKey === 'string'
  ) {
    return {
      data: params.data,
      publicKey: fallback.publicKey,
      signature: {
        field: params.signature.field,
        scalar: params.signature.scalar,
      },
    };
  }
}`;

  const response = await postJson<{
    data?: {
      sendZkapp?: {
        zkapp?: {
          hash?: string;
          id?: string;
          failureReason?: Array<{ failures?: string[]; index?: number }>;
        };
      };
    };
    errors?: Array<{ message?: string }>;
  }>(await getGraphqlEndpointForNetwork(await getCurrentNetworkId()), { query });

  if (Array.isArray(response.errors) && response.errors.length > 0) {
    throw createDappError(
      DAPP_ERROR_CODES.internalError,
      response.errors[0]?.message || 'Failed to broadcast zkApp transaction.',
    );
  }

  const zkapp = response.data?.sendZkapp?.zkapp;
  if (!zkapp?.hash && !zkapp?.id) {
    throw createDappError(
      DAPP_ERROR_CODES.internalError,
      'The zkApp transaction was signed but not accepted by the node.',
      response,
    );
  }

  return {
    hash: zkapp.hash ?? zkapp.id,
    id: zkapp.id ?? zkapp.hash,
    failureReason: zkapp.failureReason,
  };
}

async function resolveApproval(
  requestId: string,
  approve: boolean,
  password?: string,
): Promise<void> {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    throw new Error('No pending request found.');
  }

  if (!approve) {
    finalizePendingRequest(
      requestId,
      toErrorResponse(
        createDappError(
          DAPP_ERROR_CODES.userRejected,
          'User rejected request.',
        ),
      ),
    );
    return;
  }

  try {
    let result: unknown;

    switch (pending.request.method) {
      case 'mina_requestAccounts':
        result = await performConnectApproval(pending.request);
        break;
      case 'mina_sendPayment':
        result = await performSendPayment(pending.request, password);
        break;
      case 'mina_sendStakeDelegation':
        result = await performSendStakeDelegation(pending.request, password);
        break;
      case 'mina_signMessage':
        result = await performMessageSignature(pending.request, password);
        break;
      case 'mina_signFields':
        result = await performFieldSignature(pending.request, password);
        break;
      case 'mina_signJsonMessage':
        result = await performJsonMessageSignature(pending.request, password);
        break;
      case 'mina_createNullifier':
        result = await performCreateNullifier(pending.request, password);
        break;
      case 'mina_sendTransaction':
        result = await performTransactionSignature(pending.request, password);
        break;
      case 'mina_switchChain': {
        const { networkID } = normalizeSwitchChainParams(pending.request.params);
        const label = (await resolveNetworkLabel(networkID)) ?? networkID;
        await setCurrentNetworkId(label);
        result = { networkID: await resolveProviderNetworkId(label) };
        break;
      }
      case 'mina_addChain': {
        result = await performAddChain(pending.request);
        break;
      }
      default:
        throw createDappError(
          DAPP_ERROR_CODES.unsupportedMethod,
          'Unsupported zkApp approval method.',
        );
    }

    finalizePendingRequest(requestId, toResponse(result));
  } catch (error) {
    const dappError = asDappError(error);
    finalizePendingRequest(requestId, toErrorResponse(dappError));
    throw new Error(dappError.message);
  }
}

async function getConnectedAccounts(origin: string): Promise<string[]> {
  const wallet = await VaultManager.getActiveWallet();
  if (!wallet || wallet.type === 'ledger') {
    return [];
  }

  const permissions = await loadPermissions();
  const permission = permissions[origin];
  if (
    !permission ||
    permission.walletId !== wallet.id ||
    permission.publicKey !== wallet.publicKey
  ) {
    return [];
  }

  return [wallet.publicKey];
}

async function processDappRequest(
  payload: DappRpcPayload,
): Promise<DappRpcResponse> {
  const siteOrigin = normalizeOrigin(payload.site.origin);
  const request = { ...payload, site: { ...payload.site, origin: siteOrigin } };

  switch (request.method) {
    case 'mina_accounts':
    case 'mina_getAccounts':
      return toResponse(await getConnectedAccounts(siteOrigin));

    case 'mina_requestNetwork':
      return toResponse({
        networkID: await resolveProviderNetworkId(await getCurrentNetworkId()),
      });

    case 'mina_switchChain': {
      const wallet = await getActiveSoftwareWallet();
      const { networkID } = normalizeSwitchChainParams(request.params);
      const label = await resolveNetworkLabel(networkID);
      if (!label) {
        throw createDappError(
          DAPP_ERROR_CODES.unsupportedChain,
          `Network ${networkID} is not supported.`,
        );
      }
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_addChain': {
      const wallet = await getActiveSoftwareWallet();
      normalizeAddChainParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_verifyMessage':
      return toResponse(await performMessageVerification(request));

    case 'mina_verifyFields':
      return toResponse(await performFieldVerification(request));

    case 'mina_signFields': {
      const wallet = await getActiveSoftwareWallet();
      normalizeSignFieldsParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_signJsonMessage': {
      const wallet = await getActiveSoftwareWallet();
      normalizeSignJsonMessageParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'wallet_info':
    case 'mina_getWalletInfo':
      return toResponse({
        name: 'Clorio Connect',
        slug: 'clorio-connect',
        version: chrome.runtime.getManifest().version,
        networkID: await resolveProviderNetworkId(await getCurrentNetworkId()),
      });

    case 'wallet_revokePermissions':
    case 'mina_revokePermissions': {
      const permissions = await loadPermissions();
      delete permissions[siteOrigin];
      await savePermissions(permissions);
      await broadcastAccountsChangedToConnectedTabs();
      return toResponse(true);
    }

    case 'mina_requestAccounts': {
      const wallet = await getActiveSoftwareWallet();
      const existingAccounts = await getConnectedAccounts(siteOrigin);
      if (existingAccounts.length > 0) {
        return toResponse(existingAccounts);
      }
      return enqueueApproval(request, wallet);
    }

    case 'mina_sendPayment': {
      const wallet = await getActiveSoftwareWallet();
      normalizeSendPaymentParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_sendStakeDelegation': {
      const wallet = await getActiveSoftwareWallet();
      normalizeStakeDelegationParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_signMessage': {
      const wallet = await getActiveSoftwareWallet();
      normalizeSignMessageParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_createNullifier': {
      const wallet = await getActiveSoftwareWallet();
      normalizeCreateNullifierParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    case 'mina_sendTransaction': {
      const wallet = await getActiveSoftwareWallet();
      normalizeSendTransactionParams(request.params);
      await ensureApprovedOrigin(siteOrigin, wallet);
      return enqueueApproval(request, wallet);
    }

    default:
      return toErrorResponse(
        createDappError(
          DAPP_ERROR_CODES.unsupportedMethod,
          'Unsupported zkApp method.',
        ),
      );
  }
}

export async function handleDappRpcRequest(
  payload: DappRpcPayload,
  sendResponse: (response: DappRpcResponse) => void,
): Promise<void> {
  try {
    sendResponse(await processDappRequest(payload));
  } catch (error) {
    sendResponse(toErrorResponse(asDappError(error)));
  }
}

export async function handleGetPendingDappApproval(
  sendResponse: (response: DappGetPendingApprovalResponse) => void,
): Promise<void> {
  const request = await sessionStorage.get<DappPendingApproval>(
    DAPP_PENDING_APPROVAL_STORAGE_KEY,
  );
  sendResponse({ request: request ?? null });
}

export async function handleResolveDappApproval(
  payload: { requestId: string; approve: boolean; password?: string },
  sendResponse: (response: DappResolvePendingApprovalResponse) => void,
): Promise<void> {
  try {
    await resolveApproval(payload.requestId, payload.approve, payload.password);
    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to resolve request.',
    });
  }
}
