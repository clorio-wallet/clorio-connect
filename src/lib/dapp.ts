export const DAPP_BRIDGE_CHANNEL = 'clorio:mina';
export const DAPP_PENDING_APPROVAL_STORAGE_KEY = 'clorio_dapp_pending_approval';
export const DAPP_PERMISSIONS_STORAGE_KEY = 'clorio_dapp_permissions';
export const DAPP_NETWORK_ID_STORAGE_KEY = 'clorio_dapp_network_id';
export const DAPP_APPROVAL_REQUESTED_MESSAGE = 'DAPP_APPROVAL_REQUESTED';
export const DAPP_PROVIDER_EVENT_MESSAGE = 'DAPP_PROVIDER_EVENT';

export type DappNetworkId = string;

export type DappRpcMethod =
  | 'mina_requestAccounts'
  | 'mina_getAccounts'
  | 'mina_accounts'
  | 'mina_requestNetwork'
  | 'mina_switchChain'
  | 'mina_addChain'
  | 'mina_verifyMessage'
  | 'mina_verifyFields'
  | 'mina_signFields'
  | 'mina_signJsonMessage'
  | 'mina_sendPayment'
  | 'mina_sendStakeDelegation'
  | 'mina_signMessage'
  | 'mina_sendTransaction'
  | 'mina_createNullifier'
  | 'mina_getWalletInfo'
  | 'mina_revokePermissions'
  | 'wallet_info'
  | 'wallet_revokePermissions';

export type DappProviderEventName = 'accountsChanged' | 'chainChanged';

export interface DappProviderError {
  code: number;
  message: string;
  data?: unknown;
}

export interface DappSiteInfo {
  origin: string;
  title?: string;
  iconUrl?: string;
}

export interface DappRpcPayload {
  id: string;
  method: DappRpcMethod;
  params?: unknown;
  site: DappSiteInfo;
}

export interface DappPermission {
  origin: string;
  walletId: string;
  publicKey: string;
  grantedAt: number;
}

export type DappPermissions = Record<string, DappPermission>;

export interface DappApprovalSummary {
  message?: string;
  fee?: string | number;
  amount?: string | number;
  to?: string;
  memo?: string;
  nonce?: number;
  onlySign?: boolean;
  fields?: Array<string | number>;
  entries?: Array<{ label?: string; value?: string }>;
  networkID?: string;
  name?: string;
  url?: string;
}

export interface DappApprovalAccount {
  walletId: string;
  publicKey: string;
  name: string;
  type: 'software' | 'ledger';
}

export interface DappPendingApproval {
  requestId: string;
  method: DappRpcMethod;
  site: DappSiteInfo;
  account: DappApprovalAccount;
  networkId: DappNetworkId;
  createdAt: number;
  summary?: DappApprovalSummary;
}

export interface DappSignMessageParams {
  message: string;
}

export interface DappVerifyMessageParams {
  data: string;
  publicKey: string;
  signature: {
    field: string;
    scalar: string;
  };
}

export interface DappSignFieldsParams {
  message: Array<string | number>;
}

export interface DappVerifyFieldsParams {
  message?: Array<string | number>;
  data?: Array<string | number>;
  publicKey: string;
  signature:
    | string
    | {
        field: string;
        scalar: string;
      };
}

export interface DappSignJsonMessageParams {
  message: Array<{
    label: string;
    value: string;
  }>;
}

export interface DappSendPaymentParams {
  to: string;
  amount: string | number;
  fee?: string | number;
  memo?: string;
  nonce?: number;
  from?: string;
}

export interface DappSendStakeDelegationParams {
  to: string;
  fee?: string | number;
  memo?: string;
  nonce?: number;
  from?: string;
}

export interface DappSendTransactionParams {
  transaction: unknown;
  feePayer?: {
    fee?: string | number;
    memo?: string;
  };
  nonce?: number;
  onlySign?: boolean;
}

export interface DappSwitchChainParams {
  networkID: DappNetworkId;
}

export interface DappAddChainParams {
  networkID?: string;
  chainId?: string;
  url: string;
  name: string;
}

export interface DappCreateNullifierParams {
  message: Array<string | number>;
}

export interface DappBridgeRequest {
  channel: typeof DAPP_BRIDGE_CHANNEL;
  direction: 'request';
  id: string;
  method: DappRpcMethod;
  params?: unknown;
}

export interface DappBridgeResponse {
  channel: typeof DAPP_BRIDGE_CHANNEL;
  direction: 'response';
  id: string;
  result?: unknown;
  error?: DappProviderError;
}

export interface DappBridgeEvent {
  channel: typeof DAPP_BRIDGE_CHANNEL;
  direction: 'event';
  eventName: DappProviderEventName;
  params: unknown;
}

export const DAPP_ERROR_CODES = {
  notConnected: 1001,
  userRejected: 1002,
  invalidParams: 20003,
  unsupportedChain: 20004,
  unsupportedMethod: 20006,
  internalError: 21001,
  pendingRequest: 21002,
  walletLocked: 4100,
} as const;

export function createDappError(
  code: number,
  message: string,
  data?: unknown,
): DappProviderError {
  return data === undefined ? { code, message } : { code, message, data };
}

export function getDappMethodLabel(method: DappRpcMethod): string {
  switch (method) {
    case 'mina_requestAccounts':
      return 'Connect account';
    case 'mina_accounts':
    case 'mina_getAccounts':
      return 'Read connected accounts';
    case 'mina_requestNetwork':
      return 'Read network';
    case 'mina_switchChain':
      return 'Switch network';
    case 'mina_addChain':
      return 'Add network';
    case 'mina_verifyMessage':
      return 'Verify message';
    case 'mina_verifyFields':
      return 'Verify fields';
    case 'mina_signFields':
      return 'Sign fields';
    case 'mina_signJsonMessage':
      return 'Sign JSON message';
    case 'mina_sendPayment':
      return 'Send payment';
    case 'mina_sendStakeDelegation':
      return 'Stake delegation';
    case 'mina_signMessage':
      return 'Sign message';
    case 'mina_sendTransaction':
      return 'Sign zkApp transaction';
    case 'mina_createNullifier':
      return 'Create nullifier';
    case 'mina_getWalletInfo':
      return 'Read wallet info';
    case 'mina_revokePermissions':
      return 'Revoke permissions';
    case 'wallet_info':
      return 'Read wallet info';
    case 'wallet_revokePermissions':
      return 'Revoke permissions';
    default:
      return method;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
