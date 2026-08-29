import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  decryptCredential,
  findMatchingCredentialRecords,
  storePrivateCredential,
  validateCredentialPayload,
} from '@/lib/credentials';

const account = 'B62qcredentialowner';
const credential = {
  version: 'v0',
  witness: { issuer: 'test' },
  credential: {
    owner: { value: account },
    data: { age: 21 },
  },
};

let stored: Record<string, unknown>;

beforeEach(() => {
  stored = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) =>
          Object.fromEntries(keys.map((key) => [key, stored[key]])),
        ),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.assign(stored, values);
        }),
      },
    },
  });
});

describe('Mina credential storage', () => {
  it('encrypts credentials and restricts them to wallet, account, and origin', async () => {
    const result = await storePrivateCredential({
      credential,
      walletId: 'wallet-1',
      accountPublicKey: account,
      sourceOrigin: 'https://zkapp.example/path',
      walletSecret: 'wallet secret',
    });

    expect(JSON.parse(result.credential)).toEqual(credential);
    expect(JSON.stringify(stored)).not.toContain('"age":21');

    const [record] = await findMatchingCredentialRecords(
      'wallet-1',
      account,
      'https://zkapp.example/other',
    );
    await expect(decryptCredential(record, 'wallet secret')).resolves.toEqual(
      credential,
    );
    await expect(decryptCredential(record, 'wrong secret')).rejects.toThrow();
    await expect(
      findMatchingCredentialRecords('wallet-1', account, 'https://other.example'),
    ).resolves.toHaveLength(0);
  });

  it('rejects credentials owned by another account', () => {
    expect(() => validateCredentialPayload(credential, 'B62qother')).toThrow(
      'Credential owner does not match the active account.',
    );
  });
});
