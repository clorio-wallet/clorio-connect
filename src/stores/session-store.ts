import { create } from 'zustand';

interface SessionState {
  // Temporary password storage during onboarding flow
  tempPassword: string | null;
  setTempPassword: (password: string | null) => void;

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
  
  isAuthenticated: false,
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  
  hasVault: false,
  setHasVault: (hasVault) => set({ hasVault }),
}));
