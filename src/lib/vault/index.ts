/**
 * Vault System Module Exports
 *
 * Centralized exports for the multi-wallet vault system
 */

// Core managers
export { VaultManager } from '../vault-manager';
export { VaultValidator } from '../vault-validator';
export { BIP44Service } from '../bip44';

// Types and interfaces
export type {
  VaultData,
  WalletEntry,
  LegacyVaultData,
  CreateWalletData,
  DerivedAccountData,
  ValidationResult,
  WalletOperationOptions,
  WalletType,
} from '../types/vault';

// Constants and type guards
export {
  VAULT_VERSION,
  VAULT_STORAGE_KEY,
  DEFAULT_WALLET_NAME_PREFIX,
  MINA_COIN_TYPE,
  BIP44_PURPOSE,
  isVaultData,
  isLegacyVaultData,
  isWalletEntry,
} from '../types/vault';
