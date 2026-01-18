import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  publicKey: string | null;
  accountId: string | null;
  setWallet: (data: { publicKey: string; accountId: string | null }) => void;
  resetWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      publicKey: null,
      accountId: null,
      setWallet: (data) => set({ publicKey: data.publicKey, accountId: data.accountId }),
      resetWallet: () => set({ publicKey: null, accountId: null }),
    }),
    {
      name: 'clorio_wallet_store',
    }
  )
);
