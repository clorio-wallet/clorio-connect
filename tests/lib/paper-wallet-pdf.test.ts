import { describe, expect, it } from 'vitest';
import { createPaperWalletPdf } from '../../src/lib/paper-wallet';

const data = {
  name: 'Wallet #1',
  publicKey: `B62${'1'.repeat(52)}`,
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  privateKey: `EK${'1'.repeat(50)}`,
};

describe('paper wallet PDF', () => {
  it('creates an encrypted PDF with a dedicated export password', async () => {
    const pdf = await createPaperWalletPdf(data, 'Export-pass-1!');
    const contents = await pdf.text();

    expect(contents).toContain('/Encrypt');
    expect(contents).toContain('/Filter /Standard');
    expect(contents).toContain('/CFM /AESV3');
  });

  it('rejects passwords shorter than eight characters', async () => {
    await expect(createPaperWalletPdf(data, 'short')).rejects.toThrow(
      'PDF password must be at least 8 characters long',
    );
  });
});
