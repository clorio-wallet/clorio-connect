import { useQuery } from '@tanstack/react-query';
import { customInstance } from '../axios-instance';

export interface ValidatorResponse {
  pk: string;
  name?: string;
  stake: string;
  delegation_fee: number;
  delegations?: number;
}

export interface Validator {
  address: string;
  name?: string;
  stake: number;
  fee: number;
  delegators?: number;
  isDelegated?: boolean;
}

export const getValidators = async (): Promise<ValidatorResponse[]> => {
  return customInstance<ValidatorResponse[]>({
    url: '/v1/mina/validators',
    method: 'GET',
  });
};

export const useGetValidators = (currentDelegate?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['validators'],
    queryFn: getValidators,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 60,
    select: (data) => {
      return data.map((v): Validator => ({
        address: v.pk,
        name: v.name,
        stake: Number(v.stake),
        fee: v.delegation_fee,
        delegators: v.delegations,
        isDelegated: v.pk === currentDelegate,
      })).sort((a, b) => b.stake - a.stake);
    },
  });
};
