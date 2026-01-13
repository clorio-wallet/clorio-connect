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
  logout: () => void;
  resetWallet: () => Promise<void>;
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

  logout: () => set({ 
    tempPassword: null, 
    tempMnemonic: null, 
    isAuthenticated: false 
  }),

  resetWallet: async () => {
    const { storage } = await import('@/lib/storage');
    await storage.remove('clorio_vault');
    set({
      hasVault: false,
      tempPassword: null,
      tempMnemonic: null,
      isAuthenticated: false
    });
  },
}));
