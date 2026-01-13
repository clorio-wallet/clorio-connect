export type MessageType = 'DERIVE_KEYS_FROM_MNEMONIC';

export interface BaseMessage {
  type: MessageType;
}

export interface DeriveKeysMessage extends BaseMessage {
  type: 'DERIVE_KEYS_FROM_MNEMONIC';
  payload: {
    mnemonic: string;
  };
}

export type AppMessage = DeriveKeysMessage;

export interface DeriveKeysResponse {
  publicKey: string;
  privateKey: string;
}
