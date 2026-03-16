import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGetAccount, useGetMinaInfo } from '@/api/mina/mina';
import { useGetTicker } from '@/api/ticker/ticker';
import { useGetHealth } from '@/api/health/health';
import { useMinimumLoading } from '@/hooks/use-minimum-loading';
import { DEFAULT_NETWORKS } from '@/lib/networks';

export const useDashboardData = () => {
  const { publicKey, activeWalletId, accountName } = useWalletStore();
  const { networkId, balancePollInterval } = useSettingsStore();

  const network = DEFAULT_NETWORKS[networkId] || DEFAULT_NETWORKS.mainnet;
  const pollIntervalMs =
    balancePollInterval > 0 ? balancePollInterval * 60 * 1000 : 0;

  // REST API hooks
  const {
    data: accountData,
    isLoading: isAccountLoading,
    isFetching: isAccountFetching,
    refetch: refetchAccount,
  } = useGetAccount(publicKey || '', {
    query: {
      enabled: !!publicKey,
      refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
    },
  });

  const { data: tickerData } = useGetTicker({
    query: {
      refetchInterval: 60000, // Update ticker every minute
    },
  });

  const { data: minaInfo } = useGetMinaInfo({
    query: {
      refetchInterval: 60000,
    },
  });

  const { data: healthData } = useGetHealth({
    query: {
      refetchInterval: 300000,
    },
  });

  const displayLoading = useMinimumLoading(
    isAccountLoading || isAccountFetching,
    1000,
  );

  const balanceRaw = accountData?.balance || 0;
  const balanceMina = Number(balanceRaw) / 1e9;
  const tickerPrice = Number(tickerData?.mina?.USDMINA || 0);
  const fiatValue = (balanceMina * tickerPrice).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const account = {
    id: activeWalletId || '',
    name: accountName || 'Mina Wallet',
    address: publicKey || '',
    balance: balanceMina.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    symbol: 'MINA',
    fiatValue: tickerPrice > 0 ? fiatValue : undefined,
  };

  return {
    publicKey,
    network,
    account,
    displayLoading,
    healthData,
    minaInfo,
    refetchAccount,
  };
};
