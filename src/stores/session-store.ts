import { create } from 'zustand';

interface SessionState {
  // Temporary password storage during onboarding flow
  tempPassword: string | null;
  setTempPassword: (password: string | null) => void;

  // Temporary mnemonic storage during onboarding flow
  tempMnemonic: string[] | null;
  setTempMnemonic: (mnemonic: string[] | null) => void;

  // Authentication state
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  
  // Vault state
  hasVault: boolean;
  setHasVault: (hasVault: boolean) => void;

  // Actions
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
  setIsAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_LOCK_STATUS',
        payload: { isLocked: !isAuthenticated }
      }).catch(() => {});
    }
  },
  
  hasVault: false,
  setHasVault: (hasVault) => set({ hasVault }),

  logout: async () => {
    const { sessionStorage } = await import('@/lib/storage');
    await sessionStorage.remove('clorio_session');
    set({ 
      tempPassword: null, 
      tempMnemonic: null, 
      isAuthenticated: false 
    });
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_LOCK_STATUS',
        payload: { isLocked: true }
      }).catch(() => {});
    }
  },

  resetWallet: async () => {
    const { storage, sessionStorage } = await import('@/lib/storage');
    await storage.remove('clorio_vault');
    await sessionStorage.remove('clorio_session');
    set({
      hasVault: false,
      tempPassword: null,
      tempMnemonic: null,
      isAuthenticated: false
    });
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_LOCK_STATUS',
        payload: { isLocked: true }
      }).catch(() => {});
    }
  },

  restoreSession: async () => {
    try {
      const { sessionStorage } = await import('@/lib/storage');
      const { useSettingsStore } = await import('@/stores/settings-store');
      
      const session = await sessionStorage.get<{ password: string, timestamp: number }>('clorio_session');
      if (!session) {
        // Ensure icon shows locked if no session
        if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'UPDATE_LOCK_STATUS',
            payload: { isLocked: true }
          }).catch(() => {});
        }
        return false;
      }

      const { autoLockTimeout } = useSettingsStore.getState();
      
      // If "On window close" (0), we shouldn't restore
      if (autoLockTimeout === 0) {
        await sessionStorage.remove('clorio_session');
        if (chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'UPDATE_LOCK_STATUS',
            payload: { isLocked: true }
          }).catch(() => {});
        }
        return false;
      }

      // If timer based, check expiration
      if (autoLockTimeout > 0) {
        const elapsedMinutes = (Date.now() - session.timestamp) / 1000 / 60;
        if (elapsedMinutes > autoLockTimeout) {
          await sessionStorage.remove('clorio_session');
          if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
              type: 'UPDATE_LOCK_STATUS',
              payload: { isLocked: true }
            }).catch(() => {});
          }
          return false;
        }
      }

      // Restore session and update timestamp (sliding expiration)
      await sessionStorage.set('clorio_session', { ...session, timestamp: Date.now() });
      
      set({
        isAuthenticated: true,
        tempPassword: session.password,
        hasVault: true
      });

      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'UPDATE_LOCK_STATUS',
          payload: { isLocked: false }
        }).catch(() => {});
      }
      return true;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return false;
    }
  },
}));
