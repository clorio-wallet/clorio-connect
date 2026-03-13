import { storage } from './storage';
import { CryptoService } from './crypto';
import { BIP44Service } from './bip44';
import { VaultValidator } from './vault-validator';
import type {
  VaultData,
  WalletEntry,
  CreateWalletData,
  DerivedAccountData,
  WalletOperationOptions,
  LegacyVaultData,
} from './types/vault';
import {
  VAULT_VERSION,
  VAULT_STORAGE_KEY,
  DEFAULT_WALLET_NAME_PREFIX,
  isLegacyVaultData,
  isVaultData,
} from './types/vault';

/**
 * Vault Manager
 *
 * Handles all CRUD operations for the multi-wallet vault system.
 * Manages encryption, decryption, and persistence of wallet data.
 */
export class VaultManager {
  /**
   * Load vault from storage
   *
   * @returns Vault data or null if not found
   */
  static async loadVault(): Promise<VaultData | null> {
    try {
      const data = await storage.get<VaultData | LegacyVaultData>(
        VAULT_STORAGE_KEY,
      );

      if (!data) {
        return null;
      }

      // Check if it's a legacy vault (v1) and migrate if needed
      if (isLegacyVaultData(data)) {
        console.log('Legacy vault detected, migration needed');
        // Return null for now, migration should be handled separately
        // or during wallet unlock flow
        return null;
      }

      if (!isVaultData(data)) {
        console.error('Invalid vault data structure');
        return null;
      }

      // Validate vault integrity
      const validation = VaultValidator.validateVault(data);
      if (!validation.valid) {
        console.error('Vault validation failed:', validation.errors);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load vault:', error);
      return null;
    }
  }

  /**
   * Save vault to storage
   *
   * @param vault - Vault data to save
   */
  static async saveVault(vault: VaultData): Promise<void> {
    // Validate before saving
    const validation = VaultValidator.validateVault(vault);
    if (!validation.valid) {
      throw new Error(
        `Cannot save invalid vault: ${validation.errors.join(', ')}`,
      );
    }

    // Update timestamp
    vault.updatedAt = Date.now();

    await storage.set(VAULT_STORAGE_KEY, vault);
  }

  /**
   * Create a new vault with the first wallet
   *
   * @param password - User password for encryption
   * @param walletData - Data for the first wallet
   * @returns Vault data with first wallet
   */
  static async createVault(
    password: string,
    walletData: CreateWalletData,
  ): Promise<VaultData> {
    // Encrypt the secret
    const encryptedData = await CryptoService.encrypt(
      walletData.secret,
      password,
    );

    // Generate wallet ID
    const walletId = crypto.randomUUID();

    // Derive public key based on wallet type
    let publicKey: string;
    if (walletData.type === 'mnemonic' || walletData.type === 'seed') {
      const keyPair = await BIP44Service.deriveKeyPair(
        walletData.secret,
        walletData.accountIndex || 0,
      );
      publicKey = keyPair.publicKey;
    } else if (walletData.type === 'privateKey') {
      // Use mina-signer to get public key from private key
      const Client = (await import('mina-signer')).default;
      const client = new Client({ network: 'mainnet' });
      publicKey = client.derivePublicKey(walletData.secret);
    } else if (walletData.type === 'ledger') {
      // For Ledger, the secret IS the public key (extracted from device)
      // Ledger hardware wallets are managed by lib/ledger.ts
      publicKey = walletData.secret;
    } else {
      throw new Error(
        `Unsupported wallet type for vault creation: ${walletData.type}`,
      );
    }

    const wallet: WalletEntry = {
      id: walletId,
      name: walletData.name,
      publicKey,
      encryptedSecret: encryptedData.ciphertext,
      salt: encryptedData.salt,
      iv: encryptedData.iv,
      type: walletData.type,
      derivationPath: walletData.derivationPath,
      accountIndex: walletData.accountIndex,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    const vault: VaultData = {
      version: VAULT_VERSION,
      wallets: [wallet],
      activeWalletId: walletId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveVault(vault);
    return vault;
  }

  /**
   * Add a new wallet to existing vault
   *
   * @param password - User password for encryption
   * @param walletData - Data for the new wallet
   * @param options - Operation options
   * @returns Wallet ID of the newly added wallet
   */
  static async addWallet(
    password: string,
    walletData: CreateWalletData,
    options: WalletOperationOptions = {},
  ): Promise<string> {
    const vault = await this.loadVault();
    if (!vault) {
      throw new Error('No vault found');
    }

    // Derive public key based on wallet type
    let publicKey: string;
    if (walletData.type === 'mnemonic' || walletData.type === 'seed') {
      const keyPair = await BIP44Service.deriveKeyPair(
        walletData.secret,
        walletData.accountIndex || 0,
      );
      publicKey = keyPair.publicKey;
    } else if (walletData.type === 'privateKey') {
      const Client = (await import('mina-signer')).default;
      const client = new Client({ network: 'mainnet' });
      publicKey = client.derivePublicKey(walletData.secret);
    } else if (walletData.type === 'ledger') {
      // For Ledger, the secret IS the public key (extracted from device)
      // Actual signing happens via lib/ledger.ts and hardware device
      publicKey = walletData.secret;
    } else {
      throw new Error(`Unsupported wallet type: ${walletData.type}`);
    }

    // Check if public key already exists
    if (VaultValidator.publicKeyExists(vault, publicKey)) {
      throw new Error('A wallet with this public key already exists');
    }

    // Encrypt the secret
    const encryptedData = await CryptoService.encrypt(
      walletData.secret,
      password,
    );

    // Generate wallet ID
    const walletId = crypto.randomUUID();

    const wallet: WalletEntry = {
      id: walletId,
      name: walletData.name,
      publicKey,
      encryptedSecret: encryptedData.ciphertext,
      salt: encryptedData.salt,
      iv: encryptedData.iv,
      type: walletData.type,
      derivationPath: walletData.derivationPath,
      accountIndex: walletData.accountIndex,
      createdAt: Date.now(),
      lastUsed: options.updateLastUsed ? Date.now() : undefined,
    };

    // Validate wallet entry
    const validation = VaultValidator.validateWalletEntry(wallet);
    if (!validation.valid) {
      throw new Error(`Invalid wallet data: ${validation.errors.join(', ')}`);
    }

    vault.wallets.push(wallet);

    // Set as active if requested
    if (options.setAsActive) {
      vault.activeWalletId = walletId;
    }

    await this.saveVault(vault);
    return walletId;
  }

  /**
   * Remove a wallet from vault
   *
   * @param walletId - ID of wallet to remove
   */
  static async removeWallet(walletId: string): Promise<void> {
    const vault = await this.loadVault();
    if (!vault) {
      throw new Error('No vault found');
    }

    // Check if wallet can be deleted
    if (!VaultValidator.canDeleteWallet(vault, walletId)) {
      throw new Error('Cannot delete the last wallet');
    }

    // Find wallet index
    const walletIndex = vault.wallets.findIndex((w) => w.id === walletId);
    if (walletIndex === -1) {
      throw new Error('Wallet not found');
    }

    // Remove wallet
    vault.wallets.splice(walletIndex, 1);

    // If deleted wallet was active, set first wallet as active
    if (vault.activeWalletId === walletId) {
      vault.activeWalletId = vault.wallets[0].id;
    }

    await this.saveVault(vault);
  }

  /**
   * Set active wallet
   *
   * @param walletId - ID of wallet to set as active
   * @returns Updated wallet entry
   */
  static async setActiveWallet(walletId: string): Promise<WalletEntry> {
    const vault = await this.loadVault();
    if (!vault) {
      throw new Error('No vault found');
    }

    const wallet = vault.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    vault.activeWalletId = walletId;
    wallet.lastUsed = Date.now();

    await this.saveVault(vault);
    return wallet;
  }

  /**
   * Get active wallet
   *
   * @returns Active wallet entry or null
   */
  static async getActiveWallet(): Promise<WalletEntry | null> {
    const vault = await this.loadVault();
    if (!vault) {
      return null;
    }

    return vault.wallets.find((w) => w.id === vault.activeWalletId) || null;
  }

  /**
   * Get all wallets
   *
   * @returns Array of all wallet entries
   */
  static async getAllWallets(): Promise<WalletEntry[]> {
    const vault = await this.loadVault();
    if (!vault) {
      return [];
    }

    return vault.wallets;
  }

  /**
   * Get wallet by ID
   *
   * @param walletId - Wallet ID
   * @returns Wallet entry or null
   */
  static async getWalletById(walletId: string): Promise<WalletEntry | null> {
    const vault = await this.loadVault();
    if (!vault) {
      return null;
    }

    return vault.wallets.find((w) => w.id === walletId) || null;
  }

  /**
   * Update wallet name
   *
   * @param walletId - ID of wallet to rename
   * @param name - New name
   */
  static async updateWalletName(walletId: string, name: string): Promise<void> {
    console.log('[VaultManager] updateWalletName called with:', {
      walletId,
      name,
    });

    // Validate name first
    const nameValidation = VaultValidator.validateWalletName(name);
    if (!nameValidation.valid) {
      throw new Error(
        `Invalid wallet name: ${nameValidation.errors.join(', ')}`,
      );
    }

    const vault = await this.loadVault();
    if (!vault) {
      console.error('[VaultManager] No vault found');
      throw new Error('No vault found');
    }

    console.log('[VaultManager] Vault loaded with wallets:', {
      count: vault.wallets.length,
      walletIds: vault.wallets.map((w) => ({ id: w.id, name: w.name })),
      lookingFor: walletId,
    });

    const wallet = vault.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      console.error('[VaultManager] Wallet not found!', {
        searchId: walletId,
        availableIds: vault.wallets.map((w) => w.id),
      });
      throw new Error('Wallet not found');
    }

    console.log('[VaultManager] Found wallet, updating name:', {
      oldName: wallet.name,
      newName: name.trim(),
    });

    wallet.name = name.trim();
    await this.saveVault(vault);

    console.log('[VaultManager] Wallet name updated successfully');
  }

  /**
   * Get decrypted private key for a wallet
   *
   * @param password - User password
   * @param walletId - Wallet ID
   * @returns Decrypted private key or mnemonic
   */
  static async getPrivateKey(
    password: string,
    walletId: string,
  ): Promise<string> {
    const vault = await this.loadVault();
    if (!vault) {
      throw new Error('No vault found');
    }

    const wallet = vault.wallets.find((w) => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    try {
      const decrypted = await CryptoService.decrypt(
        wallet.encryptedSecret,
        password,
        wallet.salt,
        wallet.iv,
      );

      return decrypted;
    } catch {
      throw new Error('Failed to decrypt wallet: incorrect password');
    }
  }

  /**
   * Derive a new account from existing mnemonic wallet
   *
   * @param password - User password
   * @param sourceWalletId - ID of wallet with mnemonic to derive from
   * @param name - Name for the new wallet (optional)
   * @returns Derived account data
   */
  static async deriveNewAccount(
    password: string,
    sourceWalletId: string,
    name?: string,
  ): Promise<DerivedAccountData> {
    const vault = await this.loadVault();
    if (!vault) {
      throw new Error('No vault found');
    }

    const sourceWallet = vault.wallets.find((w) => w.id === sourceWalletId);
    if (!sourceWallet) {
      throw new Error('Source wallet not found');
    }

    if (sourceWallet.type !== 'mnemonic') {
      throw new Error('Can only derive from mnemonic wallets');
    }

    // Decrypt mnemonic
    const mnemonic = await this.getPrivateKey(password, sourceWalletId);

    // Get next account index
    const nextIndex = BIP44Service.getNextAccountIndex(vault.wallets);

    // Derive new key pair
    const keyPair = await BIP44Service.deriveKeyPair(mnemonic, nextIndex);

    // Check if public key already exists
    if (VaultValidator.publicKeyExists(vault, keyPair.publicKey)) {
      throw new Error('Derived wallet already exists');
    }

    // Create wallet name
    const walletName = name || BIP44Service.getSuggestedName(nextIndex);

    // Add wallet
    const walletId = await this.addWallet(
      password,
      {
        name: walletName,
        secret: mnemonic,
        type: 'mnemonic',
        derivationPath: keyPair.derivationPath,
        accountIndex: keyPair.accountIndex,
      },
      {
        setAsActive: true,
        updateLastUsed: true,
      },
    );

    return {
      walletId,
      publicKey: keyPair.publicKey,
      accountIndex: keyPair.accountIndex,
      derivationPath: keyPair.derivationPath,
    };
  }

  /**
   * Migrate legacy vault (v1) to new format (v2)
   *
   * @param password - User password
   * @param legacyVault - Legacy vault data
   * @returns New vault data
   */
  static async migrateLegacyVault(
    password: string,
    legacyVault: LegacyVaultData,
  ): Promise<VaultData> {
    try {
      // Decrypt legacy vault
      const secret = await CryptoService.decrypt(
        legacyVault.encryptedSeed,
        password,
        legacyVault.salt,
        legacyVault.iv,
      );

      // Determine derivation parameters for new vault
      let derivationPath: string | undefined;
      let accountIndex: number | undefined;

      if (legacyVault.type === 'mnemonic') {
        const keyPair = await BIP44Service.deriveKeyPair(secret, 0);
        derivationPath = keyPair.derivationPath;
        accountIndex = 0;
      }

      // Create new vault with migrated wallet
      const vault = await this.createVault(password, {
        name: `${DEFAULT_WALLET_NAME_PREFIX}1`,
        secret,
        type: legacyVault.type,
        derivationPath,
        accountIndex,
      });

      return vault;
    } catch (error) {
      console.error('Migration error:', error);
      throw new Error('Failed to migrate legacy vault');
    }
  }

  /**
   * Check if vault exists
   *
   * @returns True if vault exists
   */
  static async vaultExists(): Promise<boolean> {
    const vault = await this.loadVault();
    return vault !== null;
  }

  /**
   * Delete entire vault (factory reset)
   */
  static async deleteVault(): Promise<void> {
    await storage.remove(VAULT_STORAGE_KEY);
  }

  /**
   * Get vault statistics
   *
   * @returns Vault stats
   */
  static async getVaultStats(): Promise<{
    totalWallets: number;
    mnemonicWallets: number;
    privateKeyWallets: number;
    derivedWallets: number;
    activeWalletId: string | null;
  }> {
    const vault = await this.loadVault();
    if (!vault) {
      return {
        totalWallets: 0,
        mnemonicWallets: 0,
        privateKeyWallets: 0,
        derivedWallets: 0,
        activeWalletId: null,
      };
    }

    const mnemonicWallets = vault.wallets.filter(
      (w) => w.type === 'mnemonic',
    ).length;
    const privateKeyWallets = vault.wallets.filter(
      (w) => w.type === 'privateKey',
    ).length;
    const derivedWallets = vault.wallets.filter((w) =>
      BIP44Service.isDerivedWallet(w),
    ).length;

    return {
      totalWallets: vault.wallets.length,
      mnemonicWallets,
      privateKeyWallets,
      derivedWallets,
      activeWalletId: vault.activeWalletId,
    };
  }
}
