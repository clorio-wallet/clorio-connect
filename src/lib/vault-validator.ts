import type {
  VaultData,
  WalletEntry,
  ValidationResult,
  WalletType,
} from './types/vault';
import { BIP44Service } from './bip44';

/**
 * Vault Validator
 *
 * Provides validation utilities for vault integrity and wallet entries.
 * Ensures data consistency and prevents invalid operations.
 */
export class VaultValidator {
  /**
   * Maximum length for wallet names
   */
  static readonly MAX_WALLET_NAME_LENGTH = 50;

  /**
   * Minimum length for wallet names
   */
  static readonly MIN_WALLET_NAME_LENGTH = 1;

  /**
   * Valid wallet types
   */
  static readonly VALID_WALLET_TYPES: WalletType[] = [
    'mnemonic',
    'privateKey',
    'ledger',
    'seed',
  ];

  /**
   * Validate complete vault structure
   *
   * @param vault - Vault data to validate
   * @returns Validation result with errors if any
   */
  static validateVault(vault: VaultData): ValidationResult {
    const errors: string[] = [];

    // Check version
    if (typeof vault.version !== 'number' || vault.version < 2) {
      errors.push('Invalid vault version');
    }

    // Check wallets array
    if (!Array.isArray(vault.wallets)) {
      errors.push('Wallets must be an array');
      return { valid: false, errors };
    }

    // Check at least one wallet exists
    if (vault.wallets.length === 0) {
      errors.push('Vault must contain at least one wallet');
      return { valid: false, errors };
    }

    // Check activeWalletId exists
    if (!vault.activeWalletId || typeof vault.activeWalletId !== 'string') {
      errors.push('Active wallet ID is required');
    } else {
      // Check activeWalletId points to existing wallet
      const activeWallet = vault.wallets.find(
        (w) => w.id === vault.activeWalletId,
      );
      if (!activeWallet) {
        errors.push(
          `Active wallet ID "${vault.activeWalletId}" does not exist in vault`,
        );
      }
    }

    // Validate each wallet
    vault.wallets.forEach((wallet, index) => {
      const walletResult = this.validateWalletEntry(wallet);
      if (!walletResult.valid) {
        walletResult.errors.forEach((error) => {
          errors.push(`Wallet ${index} (${wallet.id}): ${error}`);
        });
      }
    });

    // Check for duplicate IDs
    const ids = vault.wallets.map((w) => w.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate wallet IDs detected');
    }

    // Check for duplicate public keys
    const publicKeys = vault.wallets.map((w) => w.publicKey);
    const uniquePublicKeys = new Set(publicKeys);
    if (publicKeys.length !== uniquePublicKeys.size) {
      errors.push('Duplicate public keys detected');
    }

    // Check timestamps
    if (
      typeof vault.createdAt !== 'number' ||
      vault.createdAt <= 0 ||
      vault.createdAt > Date.now()
    ) {
      errors.push('Invalid createdAt timestamp');
    }

    if (
      typeof vault.updatedAt !== 'number' ||
      vault.updatedAt <= 0 ||
      vault.updatedAt > Date.now()
    ) {
      errors.push('Invalid updatedAt timestamp');
    }

    if (vault.updatedAt < vault.createdAt) {
      errors.push('updatedAt cannot be before createdAt');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single wallet entry
   *
   * @param wallet - Wallet entry to validate
   * @returns Validation result with errors if any
   */
  static validateWalletEntry(wallet: WalletEntry): ValidationResult {
    const errors: string[] = [];

    // Check ID
    if (!wallet.id || typeof wallet.id !== 'string') {
      errors.push('Wallet ID is required');
    } else if (!this.isValidUUID(wallet.id)) {
      errors.push('Wallet ID must be a valid UUID');
    }

    // Check name
    const nameResult = this.validateWalletName(wallet.name);
    if (!nameResult.valid) {
      errors.push(...nameResult.errors);
    }

    // Check public key
    if (!wallet.publicKey || typeof wallet.publicKey !== 'string') {
      errors.push('Public key is required');
    } else if (!this.isValidMinaPublicKey(wallet.publicKey)) {
      errors.push('Invalid Mina public key format');
    }

    // Check encrypted secret
    if (!wallet.encryptedSecret || typeof wallet.encryptedSecret !== 'string') {
      errors.push('Encrypted secret is required');
    }

    // Check salt
    if (!wallet.salt || typeof wallet.salt !== 'string') {
      errors.push('Salt is required');
    }

    // Check IV
    if (!wallet.iv || typeof wallet.iv !== 'string') {
      errors.push('IV is required');
    }

    // Check type
    if (!this.VALID_WALLET_TYPES.includes(wallet.type)) {
      errors.push(`Invalid wallet type: ${wallet.type}`);
    }

    // Check derivation path if present
    if (wallet.derivationPath !== undefined) {
      if (typeof wallet.derivationPath !== 'string') {
        errors.push('Derivation path must be a string');
      } else if (!BIP44Service.isValidDerivationPath(wallet.derivationPath)) {
        errors.push('Invalid BIP44 derivation path');
      }
    }

    // Check account index if present
    if (wallet.accountIndex !== undefined) {
      if (
        typeof wallet.accountIndex !== 'number' ||
        wallet.accountIndex < 0 ||
        !Number.isInteger(wallet.accountIndex)
      ) {
        errors.push('Account index must be a non-negative integer');
      }
    }

    // Check consistency: if derivationPath exists, accountIndex should too
    if (wallet.derivationPath && wallet.accountIndex === undefined) {
      errors.push('Derivation path requires account index');
    }

    if (wallet.accountIndex !== undefined && !wallet.derivationPath) {
      errors.push('Account index requires derivation path');
    }

    // Check createdAt
    if (
      typeof wallet.createdAt !== 'number' ||
      wallet.createdAt <= 0 ||
      wallet.createdAt > Date.now()
    ) {
      errors.push('Invalid createdAt timestamp');
    }

    // Check lastUsed if present
    if (wallet.lastUsed !== undefined) {
      if (
        typeof wallet.lastUsed !== 'number' ||
        wallet.lastUsed < wallet.createdAt ||
        wallet.lastUsed > Date.now()
      ) {
        errors.push('Invalid lastUsed timestamp');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate wallet name
   *
   * @param name - Wallet name to validate
   * @returns Validation result
   */
  static validateWalletName(name: string): ValidationResult {
    const errors: string[] = [];

    if (typeof name !== 'string') {
      errors.push('Wallet name must be a string');
      return { valid: false, errors };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < this.MIN_WALLET_NAME_LENGTH) {
      errors.push('Wallet name cannot be empty');
    }

    if (trimmedName.length > this.MAX_WALLET_NAME_LENGTH) {
      errors.push(
        `Wallet name cannot exceed ${this.MAX_WALLET_NAME_LENGTH} characters`,
      );
    }

    // Check for invalid characters (optional - could be more restrictive)
    // eslint-disable-next-line no-control-regex
    if (/[<>:"/\\|?*\u0000-\u001f]/.test(trimmedName)) {
      errors.push('Wallet name contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a wallet can be deleted
   *
   * @param vault - Current vault
   * @param walletId - ID of wallet to delete
   * @returns True if wallet can be deleted
   */
  static canDeleteWallet(vault: VaultData, walletId: string): boolean {
    // Cannot delete if it's the only wallet
    if (vault.wallets.length <= 1) {
      return false;
    }

    // Check wallet exists
    const walletExists = vault.wallets.some((w) => w.id === walletId);
    if (!walletExists) {
      return false;
    }

    return true;
  }

  /**
   * Check if a public key already exists in the vault
   *
   * @param vault - Current vault
   * @param publicKey - Public key to check
   * @param excludeWalletId - Optional wallet ID to exclude from check
   * @returns True if public key exists
   */
  static publicKeyExists(
    vault: VaultData,
    publicKey: string,
    excludeWalletId?: string,
  ): boolean {
    return vault.wallets.some(
      (w) => w.publicKey === publicKey && w.id !== excludeWalletId,
    );
  }

  /**
   * Validate UUID format (v4)
   *
   * @param uuid - String to validate
   * @returns True if valid UUID v4
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate Mina public key format (B62...)
   *
   * @param publicKey - Public key to validate
   * @returns True if valid format
   */
  static isValidMinaPublicKey(publicKey: string): boolean {
    // Mina public keys start with B62 and are 55 characters long
    return /^B62[1-9A-HJ-NP-Za-km-z]{52}$/.test(publicKey);
  }

  /**
   * Validate private key format (EK...)
   *
   * @param privateKey - Private key to validate
   * @returns True if valid format
   */
  static isValidMinaPrivateKey(privateKey: string): boolean {
    // Mina private keys start with EK and are ~52 characters
    return /^EK[1-9A-HJ-NP-Za-km-z]{50,53}$/.test(privateKey);
  }

  /**
   * Get validation errors for a specific field
   *
   * @param vault - Vault to validate
   * @param field - Field name to check
   * @returns Array of errors for that field
   */
  static getFieldErrors(vault: VaultData, field: string): string[] {
    const result = this.validateVault(vault);
    if (result.valid) return [];

    return result.errors.filter((error) =>
      error.toLowerCase().includes(field.toLowerCase()),
    );
  }

  /**
   * Check if vault is in a consistent state
   *
   * @param vault - Vault to check
   * @returns True if vault is consistent
   */
  static isConsistent(vault: VaultData): boolean {
    const result = this.validateVault(vault);
    return result.valid;
  }
}
