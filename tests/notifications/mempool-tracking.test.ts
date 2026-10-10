import { afterEach, expect, it, vi } from 'vitest';
import { trackPendingTransactions } from '../../src/lib/notifications';

afterEach(() => vi.unstubAllGlobals());
it('registers existing mempool transactions with their original network and skips confirmed and duplicate entries', async () => {
  const sendMessage = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  await trackPendingTransactions([
    { hash: 'pending', status: 'pending', type: 'payment' },
    { hash: 'pending', status: 'pending', type: 'payment' },
    { hash: 'confirmed', status: 'applied', type: 'payment' },
    { hash: 'delegation', status: 'pending', type: 'delegation' },
    { hash: '', status: 'pending', type: 'payment' },
  ], { address: 'B62address', apiUrl: 'https://api.test', networkId: 'devnet' });
  expect(sendMessage).toHaveBeenCalledTimes(2);
  expect(sendMessage).toHaveBeenCalledWith({ type: 'TRACK_TRANSACTION', payload: {
    hash: 'pending', type: 'payment', address: 'B62address', apiUrl: 'https://api.test', networkId: 'devnet',
  } });
});
