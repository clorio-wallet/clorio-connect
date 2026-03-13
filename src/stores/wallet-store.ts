import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WalletEntry } from '@/lib/types/vault';
import { VaultManager } from '@/lib/vault-manager';

export type AccountType = 'software' | 'ledger';

interface WalletState {
  // Current active wallet
  activeWalletId: string | null;
  publicKey: string | null;
  accountId: string | null;

  // Ledger-specific fields (backward compatibility)
  accountType: AccountType | null;
  accountName: string | null;
  ledgerAccountIndex: number | null;

  // Cached list of all wallets (in-memory only)
  wallets: WalletEntry[];

  // Actions
  setWallet: (data: {
    publicKey: string;
    accountId: string | null;
    walletId?: string;
    accountType?: AccountType;
    accountName?: string;
    ledgerAccountIndex?: number;
  }) => void;
  setActiveWallet: (walletId: string) => Promise<void>;
  addWallet: (wallet: WalletEntry) => void;
  removeWallet: (walletId: string) => Promise<void>;
  updateWalletName: (walletId: string, name: string) => Promise<void>;
  loadWallets: () => Promise<void>;
  getWalletById: (walletId: string) => WalletEntry | undefined;
  resetWallet: () => void;
  isLedgerAccount: () => boolean;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeWalletId: null,
      publicKey: null,
      accountId: null,
      accountType: null,
      accountName: null,
      ledgerAccountIndex: null,
      wallets: [],

      // Set wallet data (supports both legacy and multi-wallet)
      setWallet: (data) => {
        set({
          publicKey: data.publicKey,
          accountId: data.accountId,
          activeWalletId: data.walletId || get().activeWalletId,
          accountType: data.accountType ?? get().accountType ?? 'software',
          accountName: data.accountName ?? get().accountName,
          ledgerAccountIndex:
            data.ledgerAccountIndex ?? get().ledgerAccountIndex,
        });
      },

      // Switch to different wallet
      setActiveWallet: async (walletId: string) => {
        try {
          const wallet = await VaultManager.setActiveWallet(walletId);

          set({
            activeWalletId: walletId,
            publicKey: wallet.publicKey,
            accountId: null,
            accountType: wallet.type === 'ledger' ? 'ledger' : 'software',
            accountName: wallet.name,
            ledgerAccountIndex: wallet.accountIndex ?? null,
          });

          // Update wallets list to reflect lastUsed change
          await get().loadWallets();
        } catch (error) {
          console.error('Failed to set active wallet:', error);
          throw error;
        }
      },

      // Add wallet to in-memory cache
      addWallet: (wallet: WalletEntry) => {
        set((state) => ({
          wallets: [...state.wallets, wallet],
        }));
      },

      // Remove wallet
      removeWallet: async (walletId: string) => {
        try {
          await VaultManager.removeWallet(walletId);

          // Remove from cache
          set((state) => ({
            wallets: state.wallets.filter((w) => w.id !== walletId),
          }));

          // If deleted wallet was active, load the new active wallet
          if (get().activeWalletId === walletId) {
            const activeWallet = await VaultManager.getActiveWallet();
            if (activeWallet) {
              set({
                activeWalletId: activeWallet.id,
                publicKey: activeWallet.publicKey,
                accountId: null,
                accountType:
                  activeWallet.type === 'ledger' ? 'ledger' : 'software',
                accountName: activeWallet.name,
                ledgerAccountIndex: activeWallet.accountIndex ?? null,
              });
            }
          }
        } catch (error) {
          console.error('Failed to remove wallet:', error);
          throw error;
        }
      },

      // Update wallet name
      updateWalletName: async (walletId: string, name: string) => {
        try {
          console.log('[wallet-store] updateWalletName called with:', {
            walletId,
            name,
            activeWalletId: get().activeWalletId,
            walletsInStore: get().wallets.map((w) => ({
              id: w.id,
              name: w.name,
            })),
          });

          await VaultManager.updateWalletName(walletId, name);

          // Update in cache
          set((state) => ({
            wallets: state.wallets.map((w) =>
              w.id === walletId ? { ...w, name } : w,
            ),
          }));

          // Update accountName if this is the active wallet
          if (get().activeWalletId === walletId) {
            set({ accountName: name });
          }

          console.log('[wallet-store] Wallet name updated successfully');
        } catch (error) {
          console.error('[wallet-store] Failed to update wallet name:', error);
          console.error('[wallet-store] WalletId that failed:', walletId);
          console.error(
            '[wallet-store] Current wallets in store:',
            get().wallets,
          );
          throw error;
        }
      },

      // Load all wallets from vault
      loadWallets: async () => {
        try {
          const wallets = await VaultManager.getAllWallets();
          const activeWallet = await VaultManager.getActiveWallet();

          set({
            wallets,
            activeWalletId: activeWallet?.id || null,
            publicKey: activeWallet?.publicKey || null,
            accountType:
              activeWallet?.type === 'ledger' ? 'ledger' : 'software',
            accountName: activeWallet?.name || null,
            ledgerAccountIndex: activeWallet?.accountIndex ?? null,
          });
        } catch (error) {
          console.error('Failed to load wallets:', error);
        }
      },

      // Get wallet by ID from cache
      getWalletById: (walletId: string) => {
        return get().wallets.find((w) => w.id === walletId);
      },

      // Reset wallet state (logout/delete vault)
      resetWallet: () => {
        set({
          activeWalletId: null,
          publicKey: null,
          accountId: null,
          accountType: null,
          accountName: null,
          ledgerAccountIndex: null,
          wallets: [],
        });
      },

      // Check if current account is a Ledger account
      isLedgerAccount: () => get().accountType === 'ledger',
    }),
    {
      name: 'clorio_wallet_store',
      // Persist active wallet info, including ledger fields
      partialize: (state) => ({
        activeWalletId: state.activeWalletId,
        publicKey: state.publicKey,
        accountId: state.accountId,
        accountType: state.accountType,
        accountName: state.accountName,
        ledgerAccountIndex: state.ledgerAccountIndex,
      }),
    },
  ),
);
