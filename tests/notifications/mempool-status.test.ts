import { afterEach, expect, it, vi } from 'vitest';
import { defaultFetchTransactionStatus } from '../../src/background/notifications';
afterEach(() => vi.unstubAllGlobals());
it('resolves a serialized mempool ID through sender and nonce until it appears in confirmed history', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [{ source: 'B62sender', nonce: 43, status: 'applied' }], mempool: [] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [{ source: 'B62other', nonce: 44, status: 'applied' }], mempool: [] }) })
    .mockResolvedValue({ ok: true, json: async () => ({ transactions: [{ source: 'B62sender', nonce: 44, status: 'applied', hash: '5confirmed' }], mempool: [] }) });
  vi.stubGlobal('fetch', fetcher);
  const input = { hash: 'Av0serialized/command==', apiUrl: 'https://api.test', address: 'B62sender', nonce: 44 };
  expect(await defaultFetchTransactionStatus(input)).toEqual({ status: 'missing' });
  expect(await defaultFetchTransactionStatus(input)).toEqual({ status: 'missing' });
  expect(await defaultFetchTransactionStatus(input)).toEqual({ status: 'applied', hash: '5confirmed' });
  expect(fetcher).toHaveBeenCalledWith('https://api.test/v1/mina/transactions/B62sender', expect.anything());
});
it('does not infer confirmation from a missing mempool entry or unknown status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ transactions: [{ source: 'B62sender', nonce: 44 }], mempool: [] }) }));
  await expect(defaultFetchTransactionStatus({ hash: 'Av0serialized', apiUrl: 'https://api.test', address: 'B62sender', nonce: 44 })).rejects.toThrow('Unknown transaction status');
});

it('keeps a transaction pending while it is still in the mempool', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ transactions: [], mempool: [{ id: 'Av0serialized', source: 'B62sender', nonce: 44 }] }) }));
  expect(await defaultFetchTransactionStatus({ hash: 'Av0serialized', apiUrl: 'https://api.test', address: 'B62sender', nonce: 44 })).toEqual({ status: 'pending' });
});
