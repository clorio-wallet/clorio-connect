import React from 'react';
import { create } from 'zustand';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGetAccount } from '@/api/mina/mina';

interface BalanceState {
  /** raw MINA amount (not converted to human string) */
  amount: number;
  /** helper to trigger a reload; populated internally */
  refetch: () => Promise<unknown> | void;
}

export const useBalanceStore = create<BalanceState>()((set) => ({
  amount: 0,
  refetch: async () => {},
}));

/**
 * Hook exposing central balance state and utility methods.
 * Automatically drives a query that updates the store.
 */
export const useBalance = () => {
  const publicKey = useWalletStore((s) => s.publicKey);
  const { balancePollInterval } = useSettingsStore();

  const poll = balancePollInterval > 0 ? balancePollInterval * 60 * 1000 : 0;

  const {
    data: accountData,
    isLoading,
    isFetching,
    refetch,
  } = useGetAccount(publicKey || '', {
    query: {
      enabled: !!publicKey,
      refetchInterval: poll > 0 ? poll : false,
    },
  });

  React.useEffect(() => {
    const raw = Number(accountData?.balance || 0);
    const mina = raw / 1e9;
    useBalanceStore.setState({ amount: mina, refetch });
  }, [accountData, refetch]);

  const amount = useBalanceStore((s) => s.amount);

  const balanceString = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  return {
    amount,
    balanceString,
    isLoading: isLoading || isFetching,
    refetch,
  };
};
