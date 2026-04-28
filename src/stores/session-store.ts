import { create } from 'zustand';

import { useSettingsStore } from '@/stores/settings-store';

let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

interface SessionState {
  tempPassword: string | null;
  setTempPassword: (password: string | null) => void;

  tempMnemonic: string[] | null;
  setTempMnemonic: (mnemonic: string[] | null) => void;

  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;

  hasVault: boolean;
  setHasVault: (hasVault: boolean) => void;

  syncAutoLock: () => void;

  logout: () => Promise<void>;
  resetWallet: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

type SessionSetter = (
  partial: Partial<SessionState> | ((state: SessionState) => Partial<SessionState>),
) => void;

function clearAutoLockTimer() {
  if (autoLockTimer !== null) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

async function lockUiSession(set: SessionSetter): Promise<void> {
  const { sessionStorage } = await import('@/lib/storage');

  clearAutoLockTimer();
  await sessionStorage.remove('clorio_session');

  set({
    isAuthenticated: false,
    tempPassword: null,
    tempMnemonic: null,
  });
}

function armAutoLock(get: () => SessionState, set: SessionSetter): void {
  clearAutoLockTimer();

  if (!get().isAuthenticated) {
    return;
  }

  const { autoLockTimeout } = useSettingsStore.getState();
  if (autoLockTimeout <= 0) {
    return;
  }

  autoLockTimer = setTimeout(() => {
    void lockUiSession(set);
  }, autoLockTimeout * 60 * 1000);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  tempPassword: null,
  setTempPassword: (tempPassword) => set({ tempPassword }),

  tempMnemonic: null,
  setTempMnemonic: (tempMnemonic) => set({ tempMnemonic }),

  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });

    if (!isAuthenticated) {
      clearAutoLockTimer();
      return;
    }

    armAutoLock(get, set);
  },

  hasVault: false,
  setHasVault: (hasVault) => set({ hasVault }),

  syncAutoLock: () => {
    armAutoLock(get, set);
  },

  logout: async () => {
    const { sessionStorage } = await import('@/lib/storage');
    const { useWalletStore } = await import('@/stores/wallet-store');

    clearAutoLockTimer();
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

    clearAutoLockTimer();
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
      const { useWalletStore } = await import('@/stores/wallet-store');
      const storedVault = await persistentStorage.get('clorio_vault');

      set({ hasVault: Boolean(storedVault) });

      const session = await sessionStorage.get<{ timestamp: number }>(
        'clorio_session',
      );

      if (!session) {
        set({
          isAuthenticated: false,
          tempPassword: null,
        });
        return false;
      }

      const { autoLockTimeout } = useSettingsStore.getState();

      if (autoLockTimeout === 0) {
        await sessionStorage.remove('clorio_session');
        set({
          isAuthenticated: false,
          tempPassword: null,
        });
        return false;
      }

      if (autoLockTimeout > 0) {
        const elapsedMinutes = (Date.now() - session.timestamp) / 1000 / 60;
        if (elapsedMinutes > autoLockTimeout) {
          await sessionStorage.remove('clorio_session');
          set({
            isAuthenticated: false,
            tempPassword: null,
          });
          return false;
        }
      }

      await sessionStorage.set('clorio_session', {
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
        tempPassword: null,
        hasVault: true,
      });
      armAutoLock(get, set);
      return true;
    } catch (error) {
      clearAutoLockTimer();
      console.error('Failed to restore session:', error);
      set({
        isAuthenticated: false,
        tempPassword: null,
      });
      return false;
    }
  },
}));
