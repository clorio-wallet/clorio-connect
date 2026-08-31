import { describe, expect, it } from 'vitest';
import { DEFAULT_NETWORKS, getNetworkApiBaseUrl } from '@/lib/networks';

describe('network routing', () => {
  it('uses the devnet REST origin for the built-in network', () => {
    expect(getNetworkApiBaseUrl(DEFAULT_NETWORKS.devnet)).toBe(
      'https://devnet.clor.io',
    );
  });

  it('derives the REST base from the configured devnet GraphQL URL', () => {
    expect(
      getNetworkApiBaseUrl({
        name: 'Devnet',
        network: 'testnet',
        label: 'devnet',
        epochUrl: 'https://api.mina.tools/v1/epoch',
        explorerUrl: 'https://minascan.io/devnet/',
        url: 'https://devnet.clor.io/graphql',
      }),
    ).toBe('https://devnet.clor.io');
  });
});
