import { create } from 'zustand';

interface SessionState {
  tempPassword: string | null;
  setTempPassword: (password: string | null) => void;

  tempMnemonic: string[] | null;
  setTempMnemonic: (mnemonic: string[] | null) => void;

  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;

  hasVault: boolean;
  setHasVault: (hasVault: boolean) => void;

  logout: () => Promise<void>;
  resetWallet: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

export const useSessionStore = create<SessionState>((set) => ({
  tempPassword: null,
  setTempPassword: (tempPassword) => set({ tempPassword }),

  tempMnemonic: null,
  setTempMnemonic: (tempMnemonic) => set({ tempMnemonic }),

  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  hasVault: false,
  setHasVault: (hasVault) => set({ hasVault }),

  logout: async () => {
    const { sessionStorage } = await import('@/lib/storage');
    const { useWalletStore } = await import('@/stores/wallet-store');

    await sessionStorage.remove('clorio_session');
    await sessionStorage.remove('clorio_onboarding_password');

    useWalletStore.getState().resetWallet();

    set({
      tempPassword: null,
      tempMnemonic: null,
      isAuthenticated: false,
    });
  },

  resetWallet: async () => {
    const { storage, sessionStorage } = await import('@/lib/storage');
    const { useWalletStore } = await import('@/stores/wallet-store');

    await storage.remove('clorio_vault');
    await storage.remove('clorio_ledger_account');
    await sessionStorage.remove('clorio_session');
    await sessionStorage.remove('clorio_onboarding_password');

    useWalletStore.getState().resetWallet();

    set({
      hasVault: false,
      tempPassword: null,
      tempMnemonic: null,
      isAuthenticated: false,
    });
  },

  restoreSession: async () => {
    try {
      const { storage: persistentStorage, sessionStorage } =
        await import('@/lib/storage');
      const { useSettingsStore } = await import('@/stores/settings-store');
      const { useWalletStore } = await import('@/stores/wallet-store');
      const storedVault = await persistentStorage.get('clorio_vault');

      set({ hasVault: Boolean(storedVault) });

      const session = await sessionStorage.get<{
        password: string;
        timestamp: number;
      }>('clorio_session');

      if (!session) {
        const onboardingPassword = await sessionStorage.get<string>(
          'clorio_onboarding_password',
        );
        if (onboardingPassword) {
          set({ tempPassword: onboardingPassword });
        }
        return false;
      }

      const { autoLockTimeout } = useSettingsStore.getState();

      if (autoLockTimeout === 0) {
        await sessionStorage.remove('clorio_session');
        return false;
      }

      if (autoLockTimeout > 0) {
        const elapsedMinutes = (Date.now() - session.timestamp) / 1000 / 60;
        if (elapsedMinutes > autoLockTimeout) {
          await sessionStorage.remove('clorio_session');
          return false;
        }
      }

      await sessionStorage.set('clorio_session', {
        ...session,
        timestamp: Date.now(),
      });
      await sessionStorage.remove('clorio_onboarding_password');

      const vault = await persistentStorage.get<{ type?: string }>(
        'clorio_vault',
      );
      if (vault?.type === 'ledger') {
        const ledgerAccount = await persistentStorage.get<{
          address: string;
          accountName: string;
          accountIndex: number;
          type: 'ledger';
        }>('clorio_ledger_account');

        if (ledgerAccount?.type === 'ledger') {
          useWalletStore.getState().setWallet({
            publicKey: ledgerAccount.address,
            accountId: null,
            accountType: 'ledger',
            accountName: ledgerAccount.accountName,
            ledgerAccountIndex: ledgerAccount.accountIndex,
          });
        }
      }

      set({
        isAuthenticated: true,
        tempPassword: session.password,
        hasVault: true,
      });
      return true;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return false;
    }
  },
}));
