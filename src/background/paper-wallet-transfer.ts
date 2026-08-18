import type { PaperWalletPayload } from '@/messages/types';

const TRANSFER_TTL_MS = 30_000;
const MAX_PENDING_TRANSFERS = 3;
const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE58_PATTERN = /^[1-9A-HJ-NP-Za-km-z]+$/;

type PendingTransfer = {
  data: PaperWalletPayload;
  expiresAt: number;
};

const pendingTransfers = new Map<string, PendingTransfer>();

function normalizePayload(value: unknown): PaperWalletPayload | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<PaperWalletPayload>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const publicKey =
    typeof data.publicKey === 'string' ? data.publicKey.trim() : '';
  const mnemonic =
    typeof data.mnemonic === 'string' ? data.mnemonic.trim() : '';
  const privateKey =
    typeof data.privateKey === 'string' ? data.privateKey.trim() : '';

  if (
    !name ||
    name.length > 100 ||
    Array.from(name).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    }) ||
    !publicKey.startsWith('B62') ||
    publicKey.length < 50 ||
    publicKey.length > 60 ||
    !BASE58_PATTERN.test(publicKey) ||
    (!mnemonic && !privateKey) ||
    mnemonic.length > 256 ||
    privateKey.length > 256
  ) {
    return null;
  }

  if (mnemonic) {
    const words = mnemonic.split(/\s+/);
    if (
      ![12, 15, 18, 21, 24].includes(words.length) ||
      words.some((word) => !/^[a-z]+$/.test(word))
    ) {
      return null;
    }
  }

  if (
    privateKey &&
    (!privateKey.startsWith('EK') || !BASE58_PATTERN.test(privateKey))
  ) {
    return null;
  }

  return {
    name,
    publicKey,
    ...(mnemonic ? { mnemonic } : {}),
    ...(privateKey ? { privateKey } : {}),
  };
}

function removeExpired(now: number): void {
  for (const [token, transfer] of pendingTransfers) {
    if (transfer.expiresAt <= now) pendingTransfers.delete(token);
  }
}

export function storePaperWalletTransfer(
  token: string,
  value: unknown,
  now = Date.now(),
): boolean {
  removeExpired(now);
  const data = normalizePayload(value);
  if (
    !TOKEN_PATTERN.test(token) ||
    !data ||
    pendingTransfers.has(token) ||
    pendingTransfers.size >= MAX_PENDING_TRANSFERS
  ) {
    return false;
  }

  pendingTransfers.set(token, {
    data,
    expiresAt: now + TRANSFER_TTL_MS,
  });
  setTimeout(() => pendingTransfers.delete(token), TRANSFER_TTL_MS);
  return true;
}

export function takePaperWalletTransfer(
  token: string,
  now = Date.now(),
): PaperWalletPayload | undefined {
  if (!TOKEN_PATTERN.test(token)) return undefined;
  const transfer = pendingTransfers.get(token);
  pendingTransfers.delete(token);
  if (!transfer || transfer.expiresAt <= now) return undefined;
  return transfer.data;
}
