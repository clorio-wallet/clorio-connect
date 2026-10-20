import { expect, it } from 'vitest';
import { calculatePendingNonce } from '../../src/lib/nonce';

it('replays the HAR: first payment uses 47, the next uses 48', () => {
  expect(calculatePendingNonce(47, [], 'wallet').pendingNonce).toBe(47);
  const pool = [{ source: 'wallet', nonce: 47 }];
  expect(calculatePendingNonce(47, pool, 'wallet').pendingNonce).toBe(48);
  pool.push({ source: 'wallet', nonce: 48 });
  expect(calculatePendingNonce(47, pool, 'wallet').pendingNonce).toBe(49);
});

it('ignores incoming, old and duplicate nonces', () => {
  expect(calculatePendingNonce(47, [
    { source: 'wallet', nonce: 46 },
    { source: 'wallet', nonce: 47 },
    { from: 'wallet', nonce: '47' },
    { source: 'other', nonce: 900 },
  ], 'wallet').pendingNonce).toBe(48);
});

it('checks the highest pending nonce regardless of order and retains a newer account nonce', () => {
  const pool = [{ source: 'wallet', nonce: 49 }, { source: 'wallet', nonce: 47 }];
  expect(calculatePendingNonce(47, pool, 'wallet').pendingNonce).toBe(50);
  expect(calculatePendingNonce(51, pool, 'wallet').pendingNonce).toBe(51);
});

it('refuses to select a nonce from incomplete or invalid responses', () => {
  expect(() => calculatePendingNonce(47, undefined, 'wallet')).toThrow();
  expect(() => calculatePendingNonce(NaN, [], 'wallet')).toThrow();
  expect(() => calculatePendingNonce(47, [{ source: 'wallet' }], 'wallet')).toThrow();
});
