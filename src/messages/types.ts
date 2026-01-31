export type MessageType = 'DERIVE_KEYS_FROM_MNEMONIC' | 'VALIDATE_PRIVATE_KEY' | 'UPDATE_LOCK_STATUS';

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

export interface UpdateLockStatusMessage extends BaseMessage {
  type: 'UPDATE_LOCK_STATUS';
  payload: {
    isLocked: boolean;
  };
}

export type AppMessage = DeriveKeysMessage | ValidatePrivateKeyMessage | UpdateLockStatusMessage;

export interface DeriveKeysResponse {
  publicKey: string;
  privateKey: string;
}

export interface ValidatePrivateKeyResponse {
  isValid: boolean;
  publicKey?: string;
  error?: string;
}
