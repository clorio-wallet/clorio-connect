export type UiMode = 'popup' | 'sidepanel';

export type MessageType =
  | 'DERIVE_KEYS_FROM_MNEMONIC'
  | 'VALIDATE_PRIVATE_KEY'
  | 'SIGN_PAYMENT'
  | 'SIGN_DELEGATION'
  | 'LEDGER_KEEPALIVE_START'
  | 'LEDGER_KEEPALIVE_END'
  | 'LEDGER_IMPORT_ACCOUNT'
  | 'LEDGER_SUBMIT_PAYMENT'
  | 'LEDGER_SUBMIT_DELEGATION'
  | 'SET_UIMODE'
  | 'CLOSE_VIEW'
  | 'OPEN_EXTENSION';

export interface BaseMessage {
  type: MessageType;
}

export interface DeriveKeysMessage extends BaseMessage {
  type: 'DERIVE_KEYS_FROM_MNEMONIC';
  payload: {
    mnemonic: string;
  };
}

export interface ValidatePrivateKeyMessage extends BaseMessage {
  type: 'VALIDATE_PRIVATE_KEY';
  payload: {
    privateKey: string;
  };
}

export interface SignPaymentMessage extends BaseMessage {
  type: 'SIGN_PAYMENT';
  payload: {
    payment: {
      from: string;
      to: string;
      amount: string;
      fee: string;
      memo?: string;
      nonce: string;
    };
    password: string;
  };
}

export interface SignDelegationMessage extends BaseMessage {
  type: 'SIGN_DELEGATION';
  payload: {
    delegation: {
      from: string;
      to: string;
      fee: string;
      nonce: string;
      memo?: string;
    };
    password: string;
  };
}

export interface LedgerKeepaliveMessage extends BaseMessage {
  type: 'LEDGER_KEEPALIVE_START' | 'LEDGER_KEEPALIVE_END';
}

export interface LedgerImportAccountMessage extends BaseMessage {
  type: 'LEDGER_IMPORT_ACCOUNT';
  payload: {
    publicKey: string;
    accountIndex: number;
    accountName: string;
  };
}

export interface LedgerSubmitPaymentMessage extends BaseMessage {
  type: 'LEDGER_SUBMIT_PAYMENT';
  payload: {
    signature: string;
    from: string;
    to: string;
    amount: number;
    fee: number;
    nonce: number;
    memo: string;
    validUntil: number;
  };
}

export interface LedgerSubmitDelegationMessage extends BaseMessage {
  type: 'LEDGER_SUBMIT_DELEGATION';
  payload: {
    signature: string;
    from: string;
    to: string;
    fee: number;
    nonce: number;
    memo: string;
    validUntil: number;
  };
}

export interface SetUiModeMessage extends BaseMessage {
  type: 'SET_UIMODE';
  value: UiMode;
}

export interface SetUiModeResponse {
  ok: boolean;
}

/**
 * Sent by the background to all extension views (popup, sidepanel, popout)
 * to instruct them to close themselves when a mode switch occurs.
 */
export interface CloseViewMessage extends BaseMessage {
  type: 'CLOSE_VIEW';
}

/**
 * Sent by a tab (e.g. Ledger import) to ask the background to open the
 * extension UI (popup or sidepanel) in whatever mode is currently active.
 */
export interface OpenExtensionMessage extends BaseMessage {
  type: 'OPEN_EXTENSION';
}

export type AppMessage =
  | DeriveKeysMessage
  | ValidatePrivateKeyMessage
  | SignPaymentMessage
  | SignDelegationMessage
  | LedgerKeepaliveMessage
  | LedgerImportAccountMessage
  | LedgerSubmitPaymentMessage
  | LedgerSubmitDelegationMessage
  | SetUiModeMessage
  | CloseViewMessage
  | OpenExtensionMessage;

export interface DeriveKeysResponse {
  publicKey: string;
  privateKey: string;
}

export interface ValidatePrivateKeyResponse {
  isValid: boolean;
  publicKey?: string;
  error?: string;
}

export interface SignPaymentResponse {
  signature: {
    field: string;
    scalar: string;
  };
}

export interface SignDelegationResponse {
  signature: {
    field: string;
    scalar: string;
  };
}

export interface LedgerImportAccountResponse {
  success: boolean;
  account?: {
    address: string;
    accountName: string;
    accountIndex: number;
    type: 'ledger';
  };
  error?: string;
}

export interface LedgerSubmitTxResponse {
  success: boolean;
  hash?: string;
  error?: string;
}
