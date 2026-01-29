import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  publicKey: string | null;
  setWallet: (data: { publicKey: string }) => void;
  resetWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      publicKey: null,
      setWallet: (data) => set({ publicKey: data.publicKey }),
      resetWallet: () => set({ publicKey: null }),
    }),
    {
      name: 'clorio_wallet_store',
    }
  )
);
