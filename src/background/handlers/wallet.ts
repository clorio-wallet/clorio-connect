/**
 * handlers/wallet.ts
 *
 * Handles all software-wallet background messages:
 *   - DERIVE_KEYS_FROM_MNEMONIC  — derives private + public key from a BIP39 mnemonic
 *   - VALIDATE_PRIVATE_KEY       — checks whether a raw private key is valid
 *   - SIGN_DELEGATION            — signs a stake delegation using the vault password
 *
 * The vault is an AES-encrypted blob stored in chrome.storage.local under the
 * key `clorio_vault`.  It may contain either a mnemonic phrase or a raw
 * private key, distinguished by the `type` field.
 */

import Client from 'mina-signer';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import type {
  DeriveKeysResponse,
  SignPaymentResponse,
  ValidatePrivateKeyResponse,
  SignDelegationResponse,
} from '@/messages/types';

// ─── Mina client singleton ────────────────────────────────────────────────────

const client = new Client({ network: 'mainnet' });

// ─── Vault ────────────────────────────────────────────────────────────────────

interface VaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type?: 'mnemonic' | 'privateKey' | 'ledger';
}

/**
 * Decrypts the vault with the given password and returns the private key.
 * - If the vault type is `mnemonic` (or unset), derives the private key via BIP44.
 * - If the vault type is `privateKey`, returns the decrypted value directly.
 * - Throws if the vault is missing or the password is wrong.
 */
export async function getPrivateKeyFromVault(password: string): Promise<string> {
  const vault = await storage.get<VaultData>('clorio_vault');

  if (!vault) {
    throw new Error('No wallet vault found in storage.');
  }

  const decrypted = await CryptoService.decrypt(
    vault.encryptedSeed,
    password,
    vault.salt,
    vault.iv,
  );

  if (!vault.type || vault.type === 'mnemonic') {
    return deriveMinaPrivateKey(decrypted);
  }

  return decrypted;
}

// ─── Message handlers ─────────────────────────────────────────────────────────

/**
 * Handle DERIVE_KEYS_FROM_MNEMONIC.
 * Derives the Mina private key from the mnemonic and returns both keys.
 */
export async function handleDeriveKeys(
  payload: { mnemonic: string },
  sendResponse: (r: DeriveKeysResponse | { error: string }) => void,
): Promise<void> {
  try {
    const privateKey = await deriveMinaPrivateKey(payload.mnemonic);
    const publicKey = client.derivePublicKey(privateKey);
    sendResponse({ privateKey, publicKey });
  } catch (error) {
    console.error('[wallet] DERIVE_KEYS_FROM_MNEMONIC failed:', error);
    sendResponse({
      error: error instanceof Error ? error.message : 'Key derivation failed.',
    });
  }
}

/**
 * Handle VALIDATE_PRIVATE_KEY.
 * Attempts to derive the public key — if it succeeds the private key is valid.
 */
export function handleValidatePrivateKey(
  payload: { privateKey: string },
  sendResponse: (r: ValidatePrivateKeyResponse) => void,
): void {
  try {
    const publicKey = client.derivePublicKey(payload.privateKey);
    sendResponse({ isValid: true, publicKey });
  } catch (error) {
    console.error('[wallet] VALIDATE_PRIVATE_KEY failed:', error);
    sendResponse({ isValid: false, error: 'Invalid private key.' });
  }
}

/**
 * Handle SIGN_PAYMENT.
 * Decrypts the vault with the supplied password and signs the payment.
 */
export async function handleSignPayment(
  payload: {
    payment: {
      from: string;
      to: string;
      amount: string;
      fee: string;
      nonce: string;
      memo?: string;
    };
    password: string;
  },
  sendResponse: (r: SignPaymentResponse | { error: string }) => void,
): Promise<void> {
  try {
    const privateKey = await getPrivateKeyFromVault(payload.password);

    const payment = {
      from: payload.payment.from,
      to: payload.payment.to,
      amount: payload.payment.amount,
      fee: payload.payment.fee,
      nonce: payload.payment.nonce,
      memo: payload.payment.memo ?? '',
    };

    console.log('[wallet] SIGN_PAYMENT signing:', {
      from: payment.from,
      to: payment.to,
      amount: payment.amount,
      fee: payment.fee,
      nonce: payment.nonce,
      memo: payment.memo,
    });

    const signed = client.signPayment(payment, privateKey);

    console.log('[wallet] SIGN_PAYMENT signed:', {
      data: signed.data,
      signature: signed.signature,
    });

    sendResponse({ signature: signed.signature });
  } catch (error) {
    console.error('[wallet] SIGN_PAYMENT failed:', error);
    sendResponse({
      error: error instanceof Error ? error.message : 'Signing failed.',
    });
  }
}

/**
 * Handle SIGN_DELEGATION.
 * Decrypts the vault with the supplied password and signs the stake delegation.
 */
export async function handleSignDelegation(
  payload: {
    delegation: {
      from: string;
      to: string;
      fee: string;
      nonce: string;
      memo?: string;
    };
    password: string;
  },
  sendResponse: (r: SignDelegationResponse | { error: string }) => void,
): Promise<void> {
  try {
    const privateKey = await getPrivateKeyFromVault(payload.password);

    const stakeDelegation = {
      from: payload.delegation.from,
      to: payload.delegation.to,
      fee: payload.delegation.fee,
      nonce: payload.delegation.nonce,
      memo: payload.delegation.memo ?? '',
    };

    console.log('[wallet] SIGN_DELEGATION signing:', {
      from: stakeDelegation.from,
      to: stakeDelegation.to,
      fee: stakeDelegation.fee,
      nonce: stakeDelegation.nonce,
      memo: stakeDelegation.memo,
    });

    const signed = client.signStakeDelegation(stakeDelegation, privateKey);

    console.log('[wallet] SIGN_DELEGATION signed:', {
      data: signed.data,
      signature: signed.signature,
    });

    sendResponse({ signature: signed.signature });
  } catch (error) {
    console.error('[wallet] SIGN_DELEGATION failed:', error);
    sendResponse({
      error: error instanceof Error ? error.message : 'Signing failed.',
    });
  }
}
