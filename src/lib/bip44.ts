import { mnemonicToSeed } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import type { WalletEntry } from './types/vault';

/**
 * BIP44 Service for Mina Protocol
 *
 * Handles hierarchical deterministic (HD) wallet derivation following BIP44 standard.
 * Derivation path format: m/44'/12586'/accountIndex'/0/0
 *
 * Reference: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 */

const MINA_PRIV_KEY_VERSION = 0x5a;
const MINA_COIN_TYPE = 12586; // Registered on SLIP-44
const BIP44_PURPOSE = 44;

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = BigInt(58);

/**
 * Convert bytes to Base58 encoding
 */
function toBase58(bytes: Uint8Array): string {
  let x = BigInt(0);
  for (const byte of bytes) {
    x = x * BigInt(256) + BigInt(byte);
  }

  let result = '';
  while (x > 0n) {
    const remainder = Number(x % BASE);
    x = x / BASE;
    result = ALPHABET[remainder] + result;
  }

  // Leading zeros
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) break;
    result = '1' + result;
  }

  return result;
}

/**
 * SHA-256 hash
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    data as unknown as BufferSource,
  );
  return new Uint8Array(hash);
}

/**
 * Convert to Base58Check format with version byte
 */
async function toBase58Check(
  input: Uint8Array,
  versionByte: number,
): Promise<string> {
  const withVersion = new Uint8Array(input.length + 1);
  withVersion[0] = versionByte;
  withVersion.set(input, 1);

  const hash1 = await sha256(withVersion);
  const hash2 = await sha256(hash1);
  const checksum = hash2.slice(0, 4);

  const finalBytes = new Uint8Array(withVersion.length + 4);
  finalBytes.set(withVersion);
  finalBytes.set(checksum, withVersion.length);

  return toBase58(finalBytes);
}

/**
 * BIP44 Service
 */
export class BIP44Service {
  /**
   * Generate BIP44 derivation path for Mina Protocol
   *
   * @param accountIndex - Account index (0, 1, 2, ...)
   * @returns Derivation path (e.g., "m/44'/12586'/0'/0/0")
   */
  static getDerivationPath(accountIndex: number): string {
    if (accountIndex < 0 || !Number.isInteger(accountIndex)) {
      throw new Error('Account index must be a non-negative integer');
    }
    return `m/${BIP44_PURPOSE}'/${MINA_COIN_TYPE}'/${accountIndex}'/0/0`;
  }

  /**
   * Derive Mina private key from mnemonic and account index
   *
   * @param mnemonic - BIP39 mnemonic phrase
   * @param accountIndex - Account index (default: 0)
   * @returns Base58Check encoded private key
   */
  static async derivePrivateKey(
    mnemonic: string,
    accountIndex: number = 0,
  ): Promise<string> {
    const seed = await mnemonicToSeed(mnemonic);
    const master = HDKey.fromMasterSeed(seed);
    const derivationPath = this.getDerivationPath(accountIndex);
    const derived = master.derive(derivationPath);

    if (!derived.privateKey) {
      throw new Error('Could not derive private key');
    }

    const privKeyBytes = new Uint8Array(derived.privateKey);

    // Mina-specific: clear top 2 bits
    privKeyBytes[0] &= 0x3f;

    // Convert to little-endian
    const privKeyLE = privKeyBytes.reverse();

    // Add version byte
    const withVersion = new Uint8Array(privKeyLE.length + 1);
    withVersion[0] = 1;
    withVersion.set(privKeyLE, 1);

    return toBase58Check(withVersion, MINA_PRIV_KEY_VERSION);
  }

  /**
   * Derive both private and public keys from mnemonic
   *
   * @param mnemonic - BIP39 mnemonic phrase
   * @param accountIndex - Account index (default: 0)
   * @returns Object containing private key, public key, and derivation path
   */
  static async deriveKeyPair(
    mnemonic: string,
    accountIndex: number = 0,
  ): Promise<{
    privateKey: string;
    publicKey: string;
    derivationPath: string;
    accountIndex: number;
  }> {
    const privateKey = await this.derivePrivateKey(mnemonic, accountIndex);
    const derivationPath = this.getDerivationPath(accountIndex);

    // Use mina-signer to derive public key
    const Client = (await import('mina-signer')).default;
    const client = new Client({ network: 'mainnet' });
    const publicKey = client.derivePublicKey(privateKey);

    return {
      privateKey,
      publicKey,
      derivationPath,
      accountIndex,
    };
  }

  /**
   * Find the next available account index
   *
   * @param wallets - Array of existing wallet entries
   * @returns Next available account index
   */
  static getNextAccountIndex(wallets: WalletEntry[]): number {
    const indices = wallets
      .filter((w) => w.accountIndex !== undefined)
      .map((w) => w.accountIndex as number);

    if (indices.length === 0) return 0;

    // Find the highest index and add 1
    return Math.max(...indices) + 1;
  }

  /**
   * Validate derivation path format
   *
   * @param path - Derivation path to validate
   * @returns True if valid, false otherwise
   */
  static isValidDerivationPath(path: string): boolean {
    const pattern = new RegExp(
      `^m/${BIP44_PURPOSE}'/${MINA_COIN_TYPE}'/\\d+'/0/0$`,
    );
    return pattern.test(path);
  }

  /**
   * Extract account index from derivation path
   *
   * @param path - Derivation path
   * @returns Account index or null if invalid
   */
  static extractAccountIndex(path: string): number | null {
    if (!this.isValidDerivationPath(path)) return null;

    const match = path.match(/\/(\d+)'\/0\/0$/);
    if (!match) return null;

    return parseInt(match[1], 10);
  }

  /**
   * Check if a wallet was derived using BIP44
   *
   * @param wallet - Wallet entry to check
   * @returns True if wallet uses BIP44 derivation
   */
  static isDerivedWallet(wallet: WalletEntry): boolean {
    return (
      wallet.type === 'mnemonic' &&
      wallet.derivationPath !== undefined &&
      wallet.accountIndex !== undefined &&
      this.isValidDerivationPath(wallet.derivationPath)
    );
  }

  /**
   * Find all wallets derived from the same seed
   *
   * @param wallets - Array of wallet entries
   * @param referenceWallet - Wallet to compare against
   * @returns Array of wallets from same seed (including reference)
   */
  static findRelatedWallets(
    wallets: WalletEntry[],
    referenceWallet: WalletEntry,
  ): WalletEntry[] {
    if (!this.isDerivedWallet(referenceWallet)) {
      return [referenceWallet];
    }

    // For now, we can't deterministically know if wallets share the same seed
    // without decrypting them. This would require comparing decrypted mnemonics.
    // This is a placeholder for future implementation.
    return wallets.filter((w) => this.isDerivedWallet(w));
  }

  /**
   * Get a suggested name for a derived account
   *
   * @param accountIndex - Account index
   * @returns Suggested wallet name
   */
  static getSuggestedName(accountIndex: number): string {
    return `Wallet #${accountIndex + 1}`;
  }
}
