
import {
  useQuery
} from '@tanstack/react-query';
import type {
  DataTag,
  DefinedInitialDataOptions,
  DefinedUseQueryResult,
  QueryClient,
  QueryFunction,
  QueryKey,
  UndefinedInitialDataOptions,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query';

import type {
  GetAccount,
  GetMinaInfo
} from '.././model';

import { customInstance } from '.././axios-instance';


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];




export const getAccount = (
    address: string,
 options?: SecondParameter<typeof customInstance>,signal?: AbortSignal
) => {
      
      
      return customInstance<GetAccount>(
      {url: `/v1/mina/accounts/${address}`, method: 'GET', signal
    },
      options);
    }
  



export const getGetAccountQueryKey = (address?: string,) => {
    return [
    `/v1/mina/accounts/${address}`
    ] as const;
    }

    
export const getGetAccountQueryOptions = <TData = Awaited<ReturnType<typeof getAccount>>, TError = unknown>(address: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>>, request?: SecondParameter<typeof customInstance>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetAccountQueryKey(address);

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getAccount>>> = ({ signal }) => getAccount(address, requestOptions, signal);

      

      

   return  { queryKey, queryFn, enabled: !!(address), ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetAccountQueryResult = NonNullable<Awaited<ReturnType<typeof getAccount>>>
export type GetAccountQueryError = unknown


export function useGetAccount<TData = Awaited<ReturnType<typeof getAccount>>, TError = unknown>(
 address: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getAccount>>,
          TError,
          Awaited<ReturnType<typeof getAccount>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetAccount<TData = Awaited<ReturnType<typeof getAccount>>, TError = unknown>(
 address: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getAccount>>,
          TError,
          Awaited<ReturnType<typeof getAccount>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetAccount<TData = Awaited<ReturnType<typeof getAccount>>, TError = unknown>(
 address: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>>, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }


export function useGetAccount<TData = Awaited<ReturnType<typeof getAccount>>, TError = unknown>(
 address: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getAccount>>, TError, TData>>, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetAccountQueryOptions(address,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  query.queryKey = queryOptions.queryKey ;

  return query;
}




export const getMinaInfo = (
    
 options?: SecondParameter<typeof customInstance>,signal?: AbortSignal
) => {
      
      
      return customInstance<GetMinaInfo>(
      {url: `/v1/mina/info/`, method: 'GET', signal
    },
      options);
    }
  



export const getGetMinaInfoQueryKey = () => {
    return [
    `/v1/mina/info/`
    ] as const;
    }

    
export const getGetMinaInfoQueryOptions = <TData = Awaited<ReturnType<typeof getMinaInfo>>, TError = unknown>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getMinaInfo>>, TError, TData>>, request?: SecondParameter<typeof customInstance>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetMinaInfoQueryKey();

  

    const queryFn: QueryFunction<Awaited<ReturnType<typeof getMinaInfo>>> = ({ signal }) => getMinaInfo(requestOptions, signal);

      

      

   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getMinaInfo>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type GetMinaInfoQueryResult = NonNullable<Awaited<ReturnType<typeof getMinaInfo>>>
export type GetMinaInfoQueryError = unknown


export function useGetMinaInfo<TData = Awaited<ReturnType<typeof getMinaInfo>>, TError = unknown>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof getMinaInfo>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof getMinaInfo>>,
          TError,
          Awaited<ReturnType<typeof getMinaInfo>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetMinaInfo<TData = Awaited<ReturnType<typeof getMinaInfo>>, TError = unknown>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getMinaInfo>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof getMinaInfo>>,
          TError,
          Awaited<ReturnType<typeof getMinaInfo>>
        > , 'initialData'
      >, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useGetMinaInfo<TData = Awaited<ReturnType<typeof getMinaInfo>>, TError = unknown>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getMinaInfo>>, TError, TData>>, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }


export function useGetMinaInfo<TData = Awaited<ReturnType<typeof getMinaInfo>>, TError = unknown>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof getMinaInfo>>, TError, TData>>, request?: SecondParameter<typeof customInstance>}
 , queryClient?: QueryClient 
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getGetMinaInfoQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  query.queryKey = queryOptions.queryKey ;

  return query;
}



