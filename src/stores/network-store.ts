import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  APP_CUSTOM_NETWORKS_STORAGE_KEY,
  CustomDappNetworkConfig,
  DAPP_CUSTOM_NETWORKS_STORAGE_KEY,
  NetworkConfig,
  NetworksMap,
  DEFAULT_NETWORKS,
  normalizeNetworkUrl,
  toCustomNetworkLabel,
} from '@/lib/networks';
import { storage } from '@/lib/storage';

interface AddCustomNetworkInput {
  name: string;
  url: string;
  networkID?: string;
}

interface NetworkState {
  networks: NetworksMap;
  isLoading: boolean;
  error: string | null;
  fetchNetworks: () => Promise<void>;
  syncCustomNetworks: () => Promise<void>;
  addCustomNetwork: (input: AddCustomNetworkInput) => Promise<CustomDappNetworkConfig>;
  getNetwork: (id: string) => NetworkConfig | undefined;
}

async function loadCustomNetworks(): Promise<NetworksMap> {
  const [dappCustomNetworks, appCustomNetworks] = await Promise.all([
    storage.get<Record<string, CustomDappNetworkConfig>>(
      DAPP_CUSTOM_NETWORKS_STORAGE_KEY,
    ),
    storage.get<Record<string, CustomDappNetworkConfig>>(
      APP_CUSTOM_NETWORKS_STORAGE_KEY,
    ),
  ]);

  return {
    ...(dappCustomNetworks ?? {}),
    ...(appCustomNetworks ?? {}),
  };
}

async function loadAppCustomNetworks(): Promise<Record<string, CustomDappNetworkConfig>> {
  return (
    (await storage.get<Record<string, CustomDappNetworkConfig>>(
      APP_CUSTOM_NETWORKS_STORAGE_KEY,
    )) ?? {}
  );
}

async function saveCustomNetworks(networks: NetworksMap): Promise<void> {
  await storage.set(APP_CUSTOM_NETWORKS_STORAGE_KEY, networks);
}

function mergeNetworks(baseNetworks: NetworksMap, customNetworks: NetworksMap): NetworksMap {
  return {
    ...DEFAULT_NETWORKS,
    ...baseNetworks,
    ...customNetworks,
  };
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      networks: DEFAULT_NETWORKS,
      isLoading: false,
      error: null,

      fetchNetworks: async () => {
        set({ isLoading: true, error: null });
        try {
          const customNetworks = await loadCustomNetworks();
          const orchestraUrl = import.meta.env.VITE_ORCHESTRA_URL;
          if (!orchestraUrl) {
            throw new Error('VITE_ORCHESTRA_URL is not defined');
          }

          const response = await fetch(orchestraUrl, {
            headers: {
              accept: '*/*',
              'accept-language': 'en-US,en;q=0.9',
              'cache-control': 'no-cache',
              pragma: 'no-cache',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch networks: ${response.statusText}`);
          }

          const data: NetworksMap = await response.json();
          set({
            networks: mergeNetworks(data, customNetworks),
            isLoading: false,
          });
        } catch (error) {
          console.error('Error fetching networks:', error);
          const customNetworks = await loadCustomNetworks();
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
            networks: mergeNetworks(get().networks, customNetworks),
            // We keep existing networks (DEFAULT_NETWORKS or previously persisted) on error
          });
        }
      },

      syncCustomNetworks: async () => {
        const customNetworks = await loadCustomNetworks();
        set({ networks: mergeNetworks(get().networks, customNetworks) });
      },

      addCustomNetwork: async ({ name, url, networkID }) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Network name is required');
        }

        const normalizedUrl = normalizeNetworkUrl(url);
        const mergedCustomNetworks = (await loadCustomNetworks()) as Record<
          string,
          CustomDappNetworkConfig
        >;
        const appCustomNetworks = await loadAppCustomNetworks();

        const existing = Object.values(mergedCustomNetworks).find(
          (network) =>
            network.apiUrl === normalizedUrl ||
            network.epochUrl === normalizedUrl ||
            network.name.toLowerCase() === trimmedName.toLowerCase(),
        );

        const label = existing?.label ?? toCustomNetworkLabel(trimmedName);
        const resolvedNetworkId =
          networkID?.trim() || existing?.networkID || `custom:${label}`;
        const nextNetwork: CustomDappNetworkConfig = {
          label,
          name: trimmedName,
          network: resolvedNetworkId.toLowerCase().includes('mainnet')
            ? 'mainnet'
            : 'testnet',
          epochUrl: existing?.epochUrl ?? '',
          explorerUrl: existing?.explorerUrl ?? normalizedUrl,
          apiUrl: normalizedUrl,
          networkID: resolvedNetworkId,
          isCustom: true,
          addedAt: existing?.addedAt ?? Date.now(),
        };

        appCustomNetworks[label] = nextNetwork;
        await saveCustomNetworks(appCustomNetworks);
        set({ networks: mergeNetworks(get().networks, { ...mergedCustomNetworks, ...appCustomNetworks }) });
        return nextNetwork;
      },

      getNetwork: (id: string) => {
        return get().networks[id];
      },
    }),
    {
      name: 'clorio_networks',
    },
  ),
);
