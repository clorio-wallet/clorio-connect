import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccountType = 'software' | 'ledger';

interface WalletState {
  publicKey: string | null;
  accountId: string | null;
  accountType: AccountType | null;
  accountName: string | null;
  ledgerAccountIndex: number | null;
  setWallet: (data: {
    publicKey: string;
    accountId: string | null;
    accountType?: AccountType;
    accountName?: string;
    ledgerAccountIndex?: number;
  }) => void;
  resetWallet: () => void;
  isLedgerAccount: () => boolean;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      publicKey: null,
      accountId: null,
      accountType: null,
      accountName: null,
      ledgerAccountIndex: null,
      setWallet: (data) =>
        set({
          publicKey: data.publicKey,
          accountId: data.accountId,
          accountType: data.accountType ?? 'software',
          accountName: data.accountName ?? null,
          ledgerAccountIndex: data.ledgerAccountIndex ?? null,
        }),
      resetWallet: () =>
        set({
          publicKey: null,
          accountId: null,
          accountType: null,
          accountName: null,
          ledgerAccountIndex: null,
        }),
      isLedgerAccount: () => get().accountType === 'ledger',
    }),
    {
      name: 'clorio_wallet_store',
    },
  ),
);
