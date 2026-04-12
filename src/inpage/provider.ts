import type {
  DappBridgeEvent,
  DappBridgeRequest,
  DappBridgeResponse,
  DappProviderError,
  DappProviderEventName,
  DappSendPaymentParams,
  DappSendStakeDelegationParams,
  DappSendTransactionParams,
  DappSignMessageParams,
} from '@/lib/dapp';
import { DAPP_BRIDGE_CHANNEL } from '@/lib/dapp';

type ProviderListener = (...args: unknown[]) => void;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

class ClorioMinaProvider {
  public readonly isAuro = true;

  private readonly listeners = new Map<
    DappProviderEventName,
    Set<ProviderListener>
  >();

  private readonly pendingRequests = new Map<string, PendingRequest>();

  private accounts: string[] = [];
  private networkId: string | null = null;

  constructor() {
    window.addEventListener('message', this.handleBridgeMessage);
  }

  announce(): void {
    const info = {
      slug: 'clorio-connect',
      name: 'Clorio Connect',
    };

    window.dispatchEvent(
      new CustomEvent('mina:announceProvider', {
        detail: Object.freeze({ info, provider: this }),
      }),
    );
  }

  async requestAccounts(): Promise<string[]> {
    const accounts = (await this.request('mina_requestAccounts')) as string[];
    this.setAccounts(accounts);
    return accounts;
  }

  async getAccounts(): Promise<string[]> {
    const accounts = (await this.request('mina_accounts')) as string[];
    this.setAccounts(accounts);
    return accounts;
  }

  async requestNetwork(): Promise<{ networkID: string }> {
    const network = (await this.request('mina_requestNetwork')) as {
      networkID: string;
    };
    this.setNetwork(network);
    return network;
  }

  async signMessage(
    params: DappSignMessageParams,
  ): Promise<{ data: string; signature: { field: string; scalar: string } }> {
    return this.request('mina_signMessage', params) as Promise<{
      data: string;
      signature: { field: string; scalar: string };
    }>;
  }

  async sendTransaction(params: DappSendTransactionParams): Promise<unknown> {
    return this.request('mina_sendTransaction', params);
  }

  async sendPayment(params: DappSendPaymentParams): Promise<unknown> {
    return this.request('mina_sendPayment', params);
  }

  async sendStakeDelegation(
    params: DappSendStakeDelegationParams,
  ): Promise<unknown> {
    return this.request('mina_sendStakeDelegation', params);
  }

  async getWalletInfo(): Promise<unknown> {
    return this.request('wallet_info');
  }

  async revokePermissions(): Promise<unknown> {
    const result = await this.request('wallet_revokePermissions');
    this.setAccounts([]);
    return result;
  }

  on(eventName: DappProviderEventName, listener: ProviderListener): void {
    const listeners =
      this.listeners.get(eventName) ?? new Set<ProviderListener>();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
  }

  removeListener(
    eventName: DappProviderEventName,
    listener: ProviderListener,
  ): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  private emit(eventName: DappProviderEventName, payload: unknown): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[clorio-provider] ${eventName} listener failed`, error);
      }
    });
  }

  private setAccounts(nextAccounts: string[]): void {
    const changed =
      JSON.stringify(this.accounts) !== JSON.stringify(nextAccounts);
    this.accounts = nextAccounts;

    if (changed) {
      this.emit('accountsChanged', nextAccounts);
    }
  }

  private setNetwork(network: { networkID: string }): void {
    const changed = this.networkId !== network.networkID;
    this.networkId = network.networkID;

    if (changed) {
      this.emit('chainChanged', network);
    }
  }

  private request(
    method: DappBridgeRequest['method'],
    params?: unknown,
  ): Promise<unknown> {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const request: DappBridgeRequest = {
        channel: DAPP_BRIDGE_CHANNEL,
        direction: 'request',
        id,
        method,
        params,
      };

      window.postMessage(request, window.location.origin);
    });
  }

  private handleBridgeMessage = (
    event: MessageEvent<DappBridgeResponse | DappBridgeEvent>,
  ): void => {
    if (event.source !== window) {
      return;
    }

    const { data } = event;
    if (!data || data.channel !== DAPP_BRIDGE_CHANNEL) {
      return;
    }

    if (data.direction === 'event') {
      this.emit(data.eventName, data.params);
      return;
    }

    if (data.direction !== 'response') {
      return;
    }

    const pending = this.pendingRequests.get(data.id);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(data.id);

    if (data.error) {
      pending.reject(data.error as DappProviderError);
      return;
    }

    pending.resolve(data.result);
  };
}

declare global {
  interface Window {
    mina?: ClorioMinaProvider;
  }
}

export function installMinaProvider(): void {
  const provider = new ClorioMinaProvider();
  window.mina = provider;

  window.addEventListener('mina:requestProvider', () => {
    provider.announce();
  });

  provider.announce();
}
