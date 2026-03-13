/**
 * handlers/wallet.ts
 *
 * Handles all software-wallet background messages:
 *   - DERIVE_KEYS_FROM_MNEMONIC  — derives private + public key from a BIP39 mnemonic
 *   - VALIDATE_PRIVATE_KEY       — checks whether a raw private key is valid
 *   - SIGN_DELEGATION            — signs a stake delegation using the vault password
 *
 * Updated for Multi-Wallet System (v2):
 *   - Uses VaultManager for vault operations
 *   - Supports multiple wallets under single vault
 *   - Signs using active wallet or specified walletId
 */

import Client from 'mina-signer';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import { VaultManager } from '@/lib/vault-manager';
import type {
  DeriveKeysResponse,
  SignPaymentResponse,
  ValidatePrivateKeyResponse,
  SignDelegationResponse,
} from '@/messages/types';

// ─── Mina client singleton ────────────────────────────────────────────────────

const client = new Client({ network: 'mainnet' });

// ─── Vault (Legacy v1 support) ────────────────────────────────────────────────

interface LegacyVaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type?: 'mnemonic' | 'privateKey' | 'ledger';
}

/**
 * Gets the private key from the active wallet in the vault.
 *
 * Supports both:
 * - Vault v2 (multi-wallet): Uses VaultManager to get active wallet's private key
 * - Vault v1 (legacy): Falls back to old vault format for backward compatibility
 *
 * @param password - User password for decryption
 * @param walletId - Optional wallet ID (defaults to active wallet)
 * @returns Decrypted private key
 * @throws If vault is missing, password is wrong, or wallet not found
 */
export async function getPrivateKeyFromVault(
  password: string,
  walletId?: string,
): Promise<string> {
  // Try vault v2 first (multi-wallet)
  const vault = await VaultManager.loadVault();

  if (vault) {
    // Vault v2 exists - use VaultManager
    const targetWalletId = walletId || vault.activeWalletId;
    const wallet = vault.wallets.find((w) => w.id === targetWalletId);

    if (!wallet) {
      throw new Error(`Wallet ${targetWalletId} not found in vault.`);
    }

    // For ledger wallets, we don't have a private key
    if (wallet.type === 'ledger') {
      throw new Error(
        'Cannot get private key from Ledger wallet. Use hardware signing.',
      );
    }

    // Decrypt the wallet's secret
    const secret = await VaultManager.getPrivateKey(password, targetWalletId);

    // If mnemonic, derive private key
    if (wallet.type === 'mnemonic' || wallet.type === 'seed') {
      const accountIndex = wallet.accountIndex ?? 0;
      return deriveMinaPrivateKey(secret, accountIndex);
    }

    // Otherwise it's already a private key
    return secret;
  }

  // Fallback to legacy vault v1 for backward compatibility
  const legacyVault = await storage.get<LegacyVaultData>('clorio_vault');

  if (!legacyVault) {
    throw new Error('No wallet vault found in storage.');
  }

  const decrypted = await CryptoService.decrypt(
    legacyVault.encryptedSeed,
    password,
    legacyVault.salt,
    legacyVault.iv,
  );

  if (!legacyVault.type || legacyVault.type === 'mnemonic') {
    return deriveMinaPrivateKey(decrypted, 0);
  }

  return decrypted;
}

// ─── Message handlers ─────────────────────────────────────────────────────────

/**
 * Handle DERIVE_KEYS_FROM_MNEMONIC.
 * Derives the Mina private key from the mnemonic and returns both keys.
 * Supports optional account index for BIP44 derivation.
 */
export async function handleDeriveKeys(
  payload: { mnemonic: string; accountIndex?: number },
  sendResponse: (r: DeriveKeysResponse | { error: string }) => void,
): Promise<void> {
  try {
    const accountIndex = payload.accountIndex ?? 0;
    const privateKey = await deriveMinaPrivateKey(
      payload.mnemonic,
      accountIndex,
    );
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
 * Uses the active wallet or specified walletId.
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
    walletId?: string;
  },
  sendResponse: (r: SignPaymentResponse | { error: string }) => void,
): Promise<void> {
  try {
    const privateKey = await getPrivateKeyFromVault(
      payload.password,
      payload.walletId,
    );

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
 * Uses the active wallet or specified walletId.
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
    walletId?: string;
  },
  sendResponse: (r: SignDelegationResponse | { error: string }) => void,
): Promise<void> {
  try {
    const privateKey = await getPrivateKeyFromVault(
      payload.password,
      payload.walletId,
    );

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
