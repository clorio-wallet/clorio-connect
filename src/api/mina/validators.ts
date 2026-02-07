import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { customInstance } from '../axios-instance';

export interface Validator {
  address: string;
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
  return useQuery({
    queryKey: ['validators'],
    queryFn: ({ signal }) => getValidators(signal),
    ...options,
  });
};
