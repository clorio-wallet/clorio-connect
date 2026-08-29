import { STORED_CREDENTIALS_KEY } from '@/lib/dapp';
import { storage } from '@/lib/storage';

const CREDENTIAL_MAX_BYTES = 256 * 1024;
const KEY_INFO = new TextEncoder().encode('clorio-mina-credentials-v1');

export interface EncryptedCredentialRecord {
  id: string;
  walletId: string;
  accountPublicKey: string;
  origin: string;
  storedAt: number;
  version: 1;
  encrypted: {
    salt: string;
    iv: string;
    ciphertext: string;
  };
}

const bytesToBase64 = (value: Uint8Array): string => {
  let binary = '';
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const deriveCredentialKey = async (walletSecret: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(walletSecret),
    'HKDF',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: KEY_INFO as BufferSource,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

const getAuthenticatedMetadata = (
  record: Omit<EncryptedCredentialRecord, 'encrypted'>,
) => new TextEncoder().encode(JSON.stringify(record));

const isEncryptedRecord = (
  value: unknown,
): value is EncryptedCredentialRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<EncryptedCredentialRecord>;
  return (
    record.version === 1 &&
    typeof record.id === 'string' &&
    typeof record.walletId === 'string' &&
    typeof record.accountPublicKey === 'string' &&
    typeof record.origin === 'string' &&
    typeof record.storedAt === 'number' &&
    !!record.encrypted &&
    typeof record.encrypted.salt === 'string' &&
    typeof record.encrypted.iv === 'string' &&
    typeof record.encrypted.ciphertext === 'string'
  );
};

const loadRecords = async (): Promise<EncryptedCredentialRecord[]> => {
  const records = await storage.get<unknown>(STORED_CREDENTIALS_KEY);
  return Array.isArray(records) ? records.filter(isEncryptedRecord) : [];
};

const readCredentialOwner = (credential: unknown): string | undefined => {
  if (!credential || typeof credential !== 'object') return undefined;
  const body = (credential as Record<string, unknown>).credential;
  if (!body || typeof body !== 'object') return undefined;
  const owner = (body as Record<string, unknown>).owner;
  if (typeof owner === 'string') return owner;
  if (owner && typeof owner === 'object') {
    const value = (owner as Record<string, unknown>).value;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
};

export const validateCredentialPayload = (
  credential: unknown,
  accountPublicKey?: string,
): string => {
  if (!credential || typeof credential !== 'object' || Array.isArray(credential)) {
    throw new Error('Credential must be an object.');
  }

  let canonical: string;
  try {
    canonical = JSON.stringify(credential);
  } catch {
    throw new Error('Credential must be serializable.');
  }

  if (!canonical || new TextEncoder().encode(canonical).byteLength > CREDENTIAL_MAX_BYTES) {
    throw new Error('Credential payload is too large.');
  }

  const owner = readCredentialOwner(credential);
  if (owner && accountPublicKey && owner !== accountPublicKey) {
    throw new Error('Credential owner does not match the active account.');
  }

  return canonical;
};

export const getCredentialPreview = (credential: unknown) => ({
  owner: readCredentialOwner(credential),
  size: new TextEncoder().encode(validateCredentialPayload(credential)).byteLength,
});

export const storePrivateCredential = async ({
  credential,
  walletId,
  accountPublicKey,
  sourceOrigin,
  walletSecret,
}: {
  credential: unknown;
  walletId: string;
  accountPublicKey: string;
  sourceOrigin: string;
  walletSecret: string;
}): Promise<{ id: string; storedAt: number; credential: string }> => {
  if (!walletSecret) throw new Error('Wallet must be unlocked.');
  const canonical = validateCredentialPayload(credential, accountPublicKey);
  const origin = new URL(sourceOrigin).origin;
  if (!['http:', 'https:'].includes(new URL(origin).protocol)) {
    throw new Error('Credential origin is not supported.');
  }

  const metadata = {
    id: crypto.randomUUID(),
    walletId,
    accountPublicKey,
    origin,
    storedAt: Date.now(),
    version: 1 as const,
  };
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveCredentialKey(walletSecret, salt);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: getAuthenticatedMetadata(metadata) as BufferSource,
    },
    key,
    new TextEncoder().encode(canonical),
  );

  const record: EncryptedCredentialRecord = {
    ...metadata,
    encrypted: {
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    },
  };
  await storage.set(STORED_CREDENTIALS_KEY, [...(await loadRecords()), record]);
  return { id: metadata.id, storedAt: metadata.storedAt, credential: canonical };
};

export const decryptCredential = async (
  record: EncryptedCredentialRecord,
  walletSecret: string,
): Promise<unknown> => {
  const { encrypted, ...metadata } = record;
  const key = await deriveCredentialKey(walletSecret, base64ToBytes(encrypted.salt));
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(encrypted.iv) as BufferSource,
      additionalData: getAuthenticatedMetadata(metadata) as BufferSource,
    },
    key,
    base64ToBytes(encrypted.ciphertext) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
};

export const findMatchingCredentialRecords = async (
  walletId: string,
  accountPublicKey: string,
  sourceOrigin: string,
): Promise<EncryptedCredentialRecord[]> => {
  const origin = new URL(sourceOrigin).origin;
  return (await loadRecords()).filter(
    (record) =>
      record.walletId === walletId &&
      record.accountPublicKey === accountPublicKey &&
      record.origin === origin,
  );
};
