import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn(), networkId: 'devnet' }));
vi.mock('../../src/api/axios-instance', () => ({ customInstance: mocks.request }));
vi.mock('../../src/stores/settings-store', () => ({ useSettingsStore: { getState: () => ({ networkId: mocks.networkId }) } }));
vi.mock('../../src/stores/network-store', () => ({ useNetworkStore: { getState: () => ({ networks: {
  devnet: { name: 'Devnet', network: 'testnet', label: 'devnet', apiUrl: 'https://devnet.test', epochUrl: '', explorerUrl: '' },
} }) } }));
import { getMempool, getTransactions } from '../../src/api/mina/transactions';

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.networkId = 'devnet'; });
it.each(['history', 'mempool'])('registers pending transactions discovered by the %s API, preserving network during a switch', async source => {
  const sendMessage = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  mocks.request.mockImplementation(async () => {
    mocks.networkId = 'mainnet';
    return {
      transactions: [{ hash: 'confirmed', status: 'applied', type: 'payment' }],
      mempool: [{ hash: 'already-pending', sender: 'B62address', type: 'payment' }],
    };
  });
  const results = await (source === 'history' ? getTransactions('B62address') : getMempool('B62address'));
  expect(results.find(tx => tx.hash === 'already-pending')?.status).toBe('pending');
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(sendMessage).toHaveBeenCalledWith({ type: 'TRACK_TRANSACTION', payload: {
    hash: 'already-pending', type: 'payment', address: 'B62address', networkId: 'devnet', apiUrl: 'https://devnet.test',
  } });
});

it('registers a successful broadcast before returning, even when the selected network configuration is missing', async () => {
  const { broadcastPayment } = await import('../../src/api/mina/transactions');
  mocks.networkId = 'mainnet'; // Not present in the mocked network map.
  const sendMessage = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  vi.stubEnv('VITE_API_URL', 'https://fallback.test');
  mocks.request.mockResolvedValue({ hash: 'new-broadcast' });
  await broadcastPayment({ from: 'B62address', to: 'B62recipient', amount: '1', fee: '1', nonce: '0', memo: '' }, { field: '1', scalar: '2' });
  expect(sendMessage).toHaveBeenCalledWith({ type: 'TRACK_TRANSACTION', payload: {
    hash: 'new-broadcast', type: 'payment', address: 'B62address', networkId: 'mainnet', apiUrl: 'https://fallback.test', nonce: 0,
  } });
  expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ baseURL: 'https://fallback.test' }));
  vi.unstubAllEnvs();
});
