import { describe, expect, it } from 'vitest';
import {
  storePaperWalletTransfer,
  takePaperWalletTransfer,
} from '../../src/background/paper-wallet-transfer';
import type { PaperWalletPayload } from '../../src/messages/types';

const data: PaperWalletPayload = {
  name: 'Wallet #1',
  publicKey: `B62${'1'.repeat(52)}`,
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
};

describe('paper wallet transfer', () => {
  it('returns credentials once, then destroys them', () => {
    const token = '00000000-0000-4000-8000-000000000001';
    expect(storePaperWalletTransfer(token, data, 1)).toBe(true);
    expect(takePaperWalletTransfer(token, 2)).toEqual(data);
    expect(takePaperWalletTransfer(token, 3)).toBeUndefined();
  });

  it('transfers both recovery phrase and private key', () => {
    const token = '00000000-0000-4000-8000-000000000004';
    const bothCredentials = {
      name: 'Wallet #1',
      publicKey: `B62${'1'.repeat(52)}`,
      mnemonic: data.mnemonic,
      privateKey: `EK${'1'.repeat(50)}`,
    };

    expect(storePaperWalletTransfer(token, bothCredentials, 1)).toBe(true);
    expect(takePaperWalletTransfer(token, 2)).toEqual(bothCredentials);
  });

  it('rejects expired and malformed transfers', () => {
    const token = '00000000-0000-4000-8000-000000000002';
    expect(storePaperWalletTransfer(token, data, 1)).toBe(true);
    expect(takePaperWalletTransfer(token, 30_002)).toBeUndefined();
    expect(storePaperWalletTransfer('bad-token', data)).toBe(false);
    expect(
      storePaperWalletTransfer('00000000-0000-4000-8000-000000000003', {
        ...data,
        mnemonic: '<script>steal()</script>',
      }),
    ).toBe(false);
  });
});
