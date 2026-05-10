import axios, { AxiosRequestConfig } from 'axios';
import { useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';

export const AXIOS_INSTANCE = axios.create({
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
  },
});

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
  }).then(({ data }) => data);

  // @ts-expect-error
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};
