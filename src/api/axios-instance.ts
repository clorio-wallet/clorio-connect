import axios, { AxiosRequestConfig } from 'axios';
import { useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { captureApiFailure } from '@/lib/analytics';

export const AXIOS_INSTANCE = axios.create({
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
  },
});

function toApiMethod(method?: string): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
  const normalized = method?.toUpperCase();
  if (
    normalized === 'GET' ||
    normalized === 'POST' ||
    normalized === 'PUT' ||
    normalized === 'PATCH' ||
    normalized === 'DELETE'
  ) {
    return normalized;
  }

  return 'GET';
}

function toEndpointGroup(url?: string): string | null {
  if (!url) {
    return null;
  }

  if (/\/v1\/mina\/transaction\/delegation(?:\/|$)/.test(url)) {
    return 'mina_transaction_delegation';
  }
  if (/\/v1\/mina\/transaction(?:\/|$)/.test(url)) {
    return 'mina_transaction';
  }
  if (/\/v1\/mina\/transactions(?:\/|$)/.test(url)) {
    return 'mina_transactions';
  }
  if (/\/v1\/mina\/accounts(?:\/|$)/.test(url)) {
    return 'mina_accounts';
  }
  if (/\/v1\/mina\/mempool(?:\/|$)/.test(url)) {
    return 'mina_mempool';
  }
  return null;
}

function captureAxiosFailure(error: unknown, config: AxiosRequestConfig): void {
  if (axios.isAxiosError(error) && axios.isCancel(error)) {
    return;
  }

  const endpointGroup = toEndpointGroup(
    axios.isAxiosError(error) ? error.config?.url ?? config.url : config.url,
  );
  if (!endpointGroup) {
    return;
  }

  if (!axios.isAxiosError(error)) {
    captureApiFailure({
      endpoint_group: endpointGroup,
      method: toApiMethod(config.method),
      failure_class: 'unknown',
      runtime_area: 'popup',
    });
    return;
  }

  captureApiFailure({
    endpoint_group: endpointGroup,
    method: toApiMethod(error.config?.method ?? config.method),
    status_code: error.response?.status,
    failure_class: error.code === 'ECONNABORTED'
      ? 'timeout'
      : error.response
        ? 'http_error'
        : 'network_error',
    runtime_area: 'popup',
  });
}

function getActiveApiBaseUrl(): string | undefined {
  const networkId = useSettingsStore.getState().networkId;
  const network = useNetworkStore.getState().networks[networkId];

  return network?.apiUrl || import.meta.env.VITE_API_URL;
}

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    baseURL: options?.baseURL || config.baseURL || getActiveApiBaseUrl(),
    cancelToken: source.token,
  })
    .then(({ data }) => data)
    .catch((error) => {
      captureAxiosFailure(error, { ...config, ...options });
      throw error;
    });

  // @ts-expect-error
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};
