/**
 * Singleton Manager for mina-signer Client
 *
 * Consolidates a single instance of the mina-signer Client to avoid multiple
 * dynamic imports. Pre-caches the module and provides consistent access to
 * the signer client instance.
 *
 * Performance targets:
 * - First load: 40-80ms (dynamic import of mina-signer)
 * - Subsequent calls: 0-5ms (cache hit)
 */

import { storage } from '@/lib/storage';
import { DAPP_NETWORK_ID_STORAGE_KEY, DappNetworkId } from '@/lib/dapp';

type MinaClient = {
  signMessage(message: string, privateKey: string): unknown;
  signPayment(input: unknown, privateKey: string): unknown;
  signStakeDelegation(input: unknown, privateKey: string): unknown;
  signTransaction(input: unknown, privateKey: string): unknown;
};

interface MinaSignerModule {
  default: new (config: { network: 'mainnet' | 'testnet' }) => MinaClient;
}

class MinaClientManager {
  private static instance: MinaClientManager;
  private clientPromise: Promise<MinaClient> | null = null;
  private startTime = 0;

  private constructor() {}

  static getInstance(): MinaClientManager {
    if (!MinaClientManager.instance) {
      MinaClientManager.instance = new MinaClientManager();
    }
    return MinaClientManager.instance;
  }

  /**
   * Retrieves the current network ID from storage
   * Falls back to mainnet if not configured
   */
  private async getCurrentNetworkId(): Promise<DappNetworkId> {
    const stored = await storage.get<string>(DAPP_NETWORK_ID_STORAGE_KEY);
    return stored === 'devnet' ? 'devnet' : 'mainnet';
  }

  /**
   * Initializes the mina-signer client with network configuration
   * This is called once per extension session
   */
  async initialize(): Promise<MinaClient> {
    if (this.clientPromise) {
      console.debug('[MinaClientManager] Client already initialized, skipping');
      return this.clientPromise;
    }

    this.startTime = performance.now();
    console.debug('[MinaClientManager] Initializing mina-signer module...');

    this.clientPromise = (async () => {
      try {
        const networkId = await this.getCurrentNetworkId();
        console.debug(
          `[MinaClientManager] Loading mina-signer for network: ${networkId}`,
        );

        const { default: Client } =
          (await import('mina-signer')) as MinaSignerModule;
        const client = new Client({
          network: networkId === 'mainnet' ? 'mainnet' : 'testnet',
        });

        const duration = performance.now() - this.startTime;
        console.debug(
          `[MinaClientManager] mina-signer initialized in ${duration.toFixed(2)}ms`,
        );

        return client;
      } catch (error) {
        this.clientPromise = null; // Reset on error for retry
        console.error(
          '[MinaClientManager] Failed to initialize client:',
          error,
        );
        throw error;
      }
    })();

    return this.clientPromise;
  }

  /**
   * Gets the singleton mina-signer client instance
   * Initializes on first call, returns cached instance on subsequent calls
   */
  async getSignerClient(): Promise<MinaClient> {
    if (!this.clientPromise) {
      await this.initialize();
    }

    const startTime = performance.now();
    const client = await this.clientPromise!;
    const duration = performance.now() - startTime;

    if (duration > 5) {
      console.debug(
        `[MinaClientManager] Client retrieval took ${duration.toFixed(2)}ms`,
      );
    }

    return client;
  }

  /**
   * Resets the cached client (useful for network switching or testing)
   */
  reset(): void {
    this.clientPromise = null;
    console.debug('[MinaClientManager] Client cache reset');
  }
}

/**
 * Gets the global MinaClientManager instance
 */
export function getMinaClientManager(): MinaClientManager {
  return MinaClientManager.getInstance();
}

/**
 * Initialize the mina-signer client at Service Worker boot time
 * Pre-loads the module to ensure fast access on first dApp request
 */
export async function initializeMinaClientManager(): Promise<MinaClient> {
  const manager = getMinaClientManager();
  return manager.initialize();
}

/**
 * Gets the singleton mina-signer client
 */
export async function getSignerClient(): Promise<MinaClient> {
  const manager = getMinaClientManager();
  return manager.getSignerClient();
}
