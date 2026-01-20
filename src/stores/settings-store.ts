import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NetworkId, DEFAULT_NETWORK_ID } from '@/lib/networks';

interface SettingsState {
  networkId: NetworkId;
  setNetworkId: (id: NetworkId) => void;
  autoLockTimeout: number; // in minutes
  setAutoLockTimeout: (minutes: number) => void;
  balancePollInterval: number; // in minutes
  setBalancePollInterval: (minutes: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      networkId: DEFAULT_NETWORK_ID,
      setNetworkId: (id) => set({ networkId: id }),
      autoLockTimeout: 15,
      setAutoLockTimeout: (minutes) => set({ autoLockTimeout: minutes }),
      balancePollInterval: 5,
      setBalancePollInterval: (minutes) =>
        set({ balancePollInterval: minutes }),
    }),
    {
      name: 'clorio_settings',
    },
  ),
);
