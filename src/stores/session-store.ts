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
}));
