import { afterEach, expect, it, vi } from 'vitest';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/axios-instance', () => ({ customInstance: request }));
import { getAccountNonce } from '../../src/api/mina/transactions';
afterEach(() => vi.resetAllMocks());

it.each([false, true])('checks both account and mempool responses (wrapped: %s)', async wrapped => {
  const pool = [{ source: 'wallet', nonce: 47 }, { source: 'wallet', nonce: 48 }];
  request.mockImplementation(async ({ url }) => url.includes('/accounts/')
    ? { nonce: 47 } : wrapped ? { mempool: pool } : pool);
  expect(await getAccountNonce('wallet')).toEqual({ nonce: 47, pendingNonce: 49, mempoolCount: 2 });
  expect(request).toHaveBeenCalledTimes(2);
});

it('refuses to choose a nonce if the mempool is unavailable', async () => {
  request.mockImplementation(async ({ url }) => {
    if (url.includes('/accounts/')) return { nonce: 47 };
    throw new Error('Mempool unavailable');
  });
  await expect(getAccountNonce('wallet')).rejects.toThrow('Mempool unavailable');
});
