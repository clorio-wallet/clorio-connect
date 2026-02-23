import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { customInstance } from '../axios-instance';
import { useSettingsStore } from '@/stores/settings-store';

export interface Validator {
  publicKey: string;
  name?: string;
  stake: number;
  fee: number;
  delegators?: number;
  isDelegated?: boolean;
  imgurl?: string;
}

export const getValidators = async (
  signal?: AbortSignal
): Promise<Validator[]> => {
  return customInstance<Validator[]>({
    url: `/v1/validators`,
    method: 'GET',
    signal,
  });   
};

export const useGetValidators = (
  options?: Omit<UseQueryOptions<Validator[], Error>, 'queryKey'>
): UseQueryResult<Validator[], Error> => {
  const networkId = useSettingsStore((s) => s.networkId);
  return useQuery({
    queryKey: ['validators', networkId],
    queryFn: ({ signal }) => getValidators(signal),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};
