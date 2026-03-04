export type MessageType =
  | 'DERIVE_KEYS_FROM_MNEMONIC'
  | 'VALIDATE_PRIVATE_KEY'
  | 'SIGN_PAYMENT'
  | 'SIGN_DELEGATION';

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

export type AppMessage =
  | DeriveKeysMessage
  | ValidatePrivateKeyMessage
  | SignPaymentMessage
  | SignDelegationMessage;

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
