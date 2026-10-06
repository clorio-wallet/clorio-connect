import { describe, expect, it } from 'vitest';
import {
  transactionWatchId,
  transitionTransactionWatch,
  type TransactionWatch,
} from '../../src/background/notifications';

const watch: TransactionWatch = {
  hash: '5abc',
  address: 'B62qaddress',
  apiUrl: 'https://api.example.test',
  networkId: 'mainnet',
  type: 'payment',
  lastStatus: 'pending',
};

describe('transaction notification watches', () => {
  it('keys watches by network and transaction hash', () => {
    expect(transactionWatchId(watch)).toBe('mainnet:5abc');
  });

  it('keeps pending transactions without a notification', () => {
    expect(transitionTransactionWatch(watch, 'pending')).toEqual({
      next: watch,
      notification: null,
    });
  });

  it('notifies once when a transaction is applied', () => {
    const result = transitionTransactionWatch(watch, 'applied');
    expect(result.next).toBeNull();
    expect(result.notification?.key).toBe('transaction.applied');
  });

  it('notifies once when a transaction fails', () => {
    const result = transitionTransactionWatch(watch, 'failed');
    expect(result.next).toBeNull();
    expect(result.notification?.key).toBe('transaction.failed');
  });
});
