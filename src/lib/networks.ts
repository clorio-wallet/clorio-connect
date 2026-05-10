export interface NetworkConfig {
  name: string;
  network: string; // e.g., 'mainnet', 'testnet'
  label: string; // id, e.g., 'mainnet', 'devnet'
  epochUrl: string;
  explorerUrl: string;
  apiUrl?: string;
}

export type NetworkId = string;

export type NetworksMap = Record<NetworkId, NetworkConfig>;

export interface CustomDappNetworkConfig extends NetworkConfig {
  networkID: string;
  isCustom: true;
  addedAt: number;
}

export const DAPP_CUSTOM_NETWORKS_STORAGE_KEY = 'clorio_dapp_custom_networks';
export const APP_CUSTOM_NETWORKS_STORAGE_KEY = 'clorio_app_custom_networks';

export const MINA_NETWORK_ID_MAP: Record<string, string> = {
  'mina:mainnet': 'mainnet',
  'mina:devnet': 'devnet',
  'mina:testnet': 'devnet',
  mainnet: 'mainnet',
  devnet: 'devnet',
};

export const CLORIO_TO_MINA_ID_MAP: Record<string, string> = {
  mainnet: 'mina:mainnet',
  devnet: 'mina:devnet',
};

// Default fallback networks (mirrors the API response structure roughly for safety)
export const DEFAULT_NETWORKS: NetworksMap = {
  mainnet: {
    name: 'Mainnet',
    network: 'mainnet',
    label: 'mainnet',
    epochUrl: import.meta.env.VITE_MAINNET_EPOCH_URL || '',
    explorerUrl: import.meta.env.VITE_MAINNET_EXPLORER_URL || '',
    apiUrl: import.meta.env.VITE_API_URL || '',
  },
  devnet: {
    name: 'Devnet',
    network: 'testnet',
    label: 'devnet',
    epochUrl: import.meta.env.VITE_DEVNET_EPOCH_URL || '',
    explorerUrl: import.meta.env.VITE_DEVNET_EXPLORER_URL || '',
    apiUrl: import.meta.env.VITE_API_URL || '',
  },
};

export const DEFAULT_NETWORK_ID: NetworkId = 'mainnet';

export function normalizeToCanonicalNetworkLabel(networkID: string): 'mainnet' | 'devnet' {
  const normalized = networkID.trim().toLowerCase();

  if (
    normalized === 'mainnet' ||
    normalized === 'mina:mainnet' ||
    normalized.startsWith('mainnet-') ||
    normalized.startsWith('mina:mainnet-')
  ) {
    return 'mainnet';
  }

  if (
    normalized === 'devnet' ||
    normalized === 'testnet' ||
    normalized === 'mina:devnet' ||
    normalized === 'mina:testnet' ||
    normalized.startsWith('devnet-') ||
    normalized.startsWith('testnet-') ||
    normalized.startsWith('mina:devnet-') ||
    normalized.startsWith('mina:testnet-')
  ) {
    return 'devnet';
  }

  return 'devnet';
}

export function canonicalLabelToSignerNetwork(
  networkLabel: string,
): 'mainnet' | 'testnet' {
  return normalizeToCanonicalNetworkLabel(networkLabel) === 'mainnet'
    ? 'mainnet'
    : 'testnet';
}

export function minaIdToLabel(networkID: string): string | null {
  return MINA_NETWORK_ID_MAP[networkID] ?? null;
}

export function labelToMinaId(label: string): string {
  return CLORIO_TO_MINA_ID_MAP[label] ?? `custom:${label}`;
}

export function normalizeNetworkUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const candidates = [trimmed];

  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) {
      candidates.unshift(decoded);
    }
  } catch {
    // Keep the original value if it was not URI-encoded.
  }

  for (const candidate of candidates) {
    try {
      return new URL(candidate).toString();
    } catch {
      continue;
    }
  }

  throw new Error('Invalid network URL');
}

export function toCustomNetworkLabel(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `custom-${base || 'network'}`;
}
