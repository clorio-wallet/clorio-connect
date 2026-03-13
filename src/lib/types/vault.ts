/**
 * Multi-Wallet Vault System Types
 *
 * Defines the structure for managing multiple wallets under a single encrypted vault.
 * Each wallet can be derived from BIP44 or imported independently.
 */

/**
 * Type of wallet based on how it was created/imported
 * - mnemonic: Created from BIP39 seed phrase
 * - privateKey: Imported from raw private key
 * - ledger: Hardware wallet (Ledger Nano S/X) - fully implemented
 * - seed: Direct seed import (advanced)
 */
export type WalletType = 'mnemonic' | 'privateKey' | 'ledger' | 'seed';

/**
 * Individual wallet entry in the vault
 */
export interface WalletEntry {
  /** Unique identifier (UUID v4) */
  id: string;

  /** User-defined name (default: "Wallet #N") */
  name: string;

  /** Mina public key (B62...) */
  publicKey: string;

  /** Encrypted secret (mnemonic/privateKey/seed) */
  encryptedSecret: string;

  /** Salt used for encryption (unique per wallet) */
  salt: string;

  /** Initialization vector for AES-GCM (unique per wallet) */
  iv: string;

  /** Type of wallet */
  type: WalletType;

  /**
   * BIP44 derivation path (e.g., "m/44'/12586'/0'/0/0")
   * Used for mnemonic/seed wallets and Ledger accounts
   */
  derivationPath?: string;

  /**
   * Account index for BIP44 derivation (0, 1, 2, ...)
   * Used for mnemonic/seed wallets and Ledger accounts
   */
  accountIndex?: number;

  /** Timestamp when wallet was created */
  createdAt: number;

  /** Timestamp when wallet was last used (for sorting) */
  lastUsed?: number;
}

/**
 * Multi-wallet vault structure
 */
export interface VaultData {
  /** Vault version (2 for multi-wallet) */
  version: number;

  /** Array of all wallets in this vault */
  wallets: WalletEntry[];

  /** ID of the currently active wallet */
  activeWalletId: string;

  /** Timestamp when vault was created */
  createdAt: number;

  /** Timestamp of last vault update */
  updatedAt: number;
}

/**
 * Legacy vault structure (v1) for backward compatibility
 */
export interface LegacyVaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type: 'mnemonic' | 'privateKey';
  createdAt: number;
}

/**
 * Data required to create a new wallet
 */
export interface CreateWalletData {
  name: string;
  secret: string; // mnemonic or private key (plain text, will be encrypted)
  type: WalletType;
  derivationPath?: string;
  accountIndex?: number;
}

/**
 * Data returned when deriving a new account from existing seed
 */
export interface DerivedAccountData {
  walletId: string;
  publicKey: string;
  accountIndex: number;
  derivationPath: string;
}

/**
 * Result of vault validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Options for wallet operations
 */
export interface WalletOperationOptions {
  /** Whether to set as active wallet after operation */
  setAsActive?: boolean;

  /** Whether to update lastUsed timestamp */
  updateLastUsed?: boolean;
}

/**
 * Constants
 */
export const VAULT_VERSION = 2;
export const VAULT_STORAGE_KEY = 'clorio_vault';
export const DEFAULT_WALLET_NAME_PREFIX = 'Wallet #';
export const MINA_COIN_TYPE = 12586; // Registered on SLIP-44
export const BIP44_PURPOSE = 44;

/**
 * Type guard to check if data is VaultData
 */
export function isVaultData(data: unknown): data is VaultData {
  if (!data || typeof data !== 'object') return false;
  const vault = data as Partial<VaultData>;

  return (
    typeof vault.version === 'number' &&
    Array.isArray(vault.wallets) &&
    typeof vault.activeWalletId === 'string' &&
    typeof vault.createdAt === 'number' &&
    typeof vault.updatedAt === 'number'
  );
}

/**
 * Type guard to check if data is LegacyVaultData
 */
export function isLegacyVaultData(data: unknown): data is LegacyVaultData {
  if (!data || typeof data !== 'object') return false;
  const vault = data as Partial<LegacyVaultData>;

  return (
    typeof vault.encryptedSeed === 'string' &&
    typeof vault.salt === 'string' &&
    typeof vault.iv === 'string' &&
    typeof vault.version === 'number' &&
    vault.version === 1
  );
}

/**
 * Type guard to check if wallet entry is valid
 */
export function isWalletEntry(data: unknown): data is WalletEntry {
  if (!data || typeof data !== 'object') return false;
  const wallet = data as Partial<WalletEntry>;

  return (
    typeof wallet.id === 'string' &&
    typeof wallet.name === 'string' &&
    typeof wallet.publicKey === 'string' &&
    typeof wallet.encryptedSecret === 'string' &&
    typeof wallet.salt === 'string' &&
    typeof wallet.iv === 'string' &&
    typeof wallet.type === 'string' &&
    typeof wallet.createdAt === 'number'
  );
}
