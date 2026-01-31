import { gql } from '@apollo/client';
import * as ApolloReactCommon from '@apollo/client/react';
import * as ApolloReactHooks from '@apollo/client/react';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Account = {
  __typename?: 'Account';
  balance?: Maybe<Balance>;
  delegate?: Maybe<Delegate>;
  mempool?: Maybe<Array<Maybe<Mempool>>>;
  nonce?: Maybe<Scalars['Int']['output']>;
  unconfirmedNonce?: Maybe<Scalars['Int']['output']>;
  usableNonce?: Maybe<Scalars['Int']['output']>;
};

export type Balance = {
  __typename?: 'Balance';
  liquid?: Maybe<Scalars['String']['output']>;
  liquidUnconfirmed?: Maybe<Scalars['String']['output']>;
  locked?: Maybe<Scalars['String']['output']>;
  total?: Maybe<Scalars['String']['output']>;
  unconfirmedTotal?: Maybe<Scalars['String']['output']>;
};

export type BlacklistedAddress = {
  __typename?: 'BlacklistedAddress';
  address?: Maybe<Scalars['String']['output']>;
};

export type BroadcastDelegation = {
  __typename?: 'BroadcastDelegation';
  id?: Maybe<Scalars['String']['output']>;
};

export type BroadcastTransaction = {
  __typename?: 'BroadcastTransaction';
  amount?: Maybe<Scalars['String']['output']>;
  fee?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  nonce?: Maybe<Scalars['Int']['output']>;
  receiver?: Maybe<SourceReceiver>;
  source?: Maybe<SourceReceiver>;
};

export type Delegate = {
  __typename?: 'Delegate';
  name?: Maybe<Scalars['String']['output']>;
  publicKey?: Maybe<Scalars['String']['output']>;
};

export type EstimatedFees = {
  __typename?: 'EstimatedFees';
  snarkFees?: Maybe<SnarkFees>;
  txFees?: Maybe<Fees>;
};

export type Fees = {
  __typename?: 'Fees';
  average?: Maybe<Scalars['Float']['output']>;
  fast?: Maybe<Scalars['Float']['output']>;
};

export type IdByPublicKey = {
  __typename?: 'IdByPublicKey';
  id?: Maybe<Scalars['String']['output']>;
};

export type Mempool = {
  __typename?: 'Mempool';
  amount?: Maybe<Scalars['String']['output']>;
  fee?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  nonce?: Maybe<Scalars['Int']['output']>;
  receiver?: Maybe<SourceReceiver>;
  source?: Maybe<SourceReceiver>;
};

export type MempoolElement = {
  __typename?: 'MempoolElement';
  amount?: Maybe<Scalars['String']['output']>;
  fee?: Maybe<Scalars['String']['output']>;
  feeToken?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  nonce?: Maybe<Scalars['String']['output']>;
  receiver?: Maybe<SourceReceiver>;
  source?: Maybe<SourceReceiver>;
};

export type Mutation = {
  __typename?: 'Mutation';
  broadcastDelegation: BroadcastDelegation;
  broadcastTransaction: BroadcastTransaction;
};


export type MutationBroadcastDelegationArgs = {
  input: SendDelegationInput;
  signature?: InputMaybe<SignatureInput>;
};


export type MutationBroadcastTransactionArgs = {
  input: SendPaymentInput;
  signature?: InputMaybe<SignatureInput>;
};

export type News = {
  __typename?: 'News';
  cta?: Maybe<Scalars['String']['output']>;
  cta_color?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  link?: Maybe<Scalars['String']['output']>;
  subtitle: Scalars['String']['output'];
  title: Scalars['String']['output'];
  version?: Maybe<Scalars['String']['output']>;
  version_op?: Maybe<Scalars['String']['output']>;
};

export type NodeInfo = {
  __typename?: 'NodeInfo';
  chainId?: Maybe<Scalars['String']['output']>;
  epoch?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  network?: Maybe<Scalars['String']['output']>;
  slot?: Maybe<Scalars['String']['output']>;
  syncStatus?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['Int']['output']>;
};

export type Query = {
  __typename?: 'Query';
  accountByKey?: Maybe<Account>;
  blacklistedAddresses?: Maybe<Array<Maybe<BlacklistedAddress>>>;
  estimatedFee?: Maybe<EstimatedFees>;
  idByPublicKey?: Maybe<IdByPublicKey>;
  mempool?: Maybe<Array<Maybe<MempoolElement>>>;
  newsHome?: Maybe<Array<Maybe<News>>>;
  newsValidators?: Maybe<Array<Maybe<News>>>;
  nodeInfo?: Maybe<NodeInfo>;
  ticker?: Maybe<Tickers>;
  transactions?: Maybe<Array<Maybe<Transaction>>>;
  transactionsCount?: Maybe<TransactionsCount>;
  validators?: Maybe<Array<Maybe<Validator>>>;
  validatorsCount?: Maybe<ValidatorsCount>;
};


export type QueryAccountByKeyArgs = {
  publicKey: Scalars['String']['input'];
};


export type QueryIdByPublicKeyArgs = {
  publicKey: Scalars['String']['input'];
};


export type QueryMempoolArgs = {
  publicKey: Scalars['String']['input'];
};


export type QueryTransactionsArgs = {
  accountId: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
};


export type QueryTransactionsCountArgs = {
  accountId: Scalars['Int']['input'];
};


export type QueryValidatorsArgs = {
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type SendDelegationInput = {
  fee: Scalars['String']['input'];
  from: Scalars['String']['input'];
  memo?: InputMaybe<Scalars['String']['input']>;
  nonce?: InputMaybe<Scalars['String']['input']>;
  to: Scalars['String']['input'];
  validUntil?: InputMaybe<Scalars['String']['input']>;
};

export type SendPaymentInput = {
  amount: Scalars['String']['input'];
  fee: Scalars['String']['input'];
  from: Scalars['String']['input'];
  memo?: InputMaybe<Scalars['String']['input']>;
  nonce?: InputMaybe<Scalars['String']['input']>;
  to: Scalars['String']['input'];
  token?: InputMaybe<Scalars['String']['input']>;
  validUntil?: InputMaybe<Scalars['String']['input']>;
};

export type SignatureInput = {
  field?: InputMaybe<Scalars['String']['input']>;
  rawSignature?: InputMaybe<Scalars['String']['input']>;
  scalar?: InputMaybe<Scalars['String']['input']>;
};

export type SnarkFees = {
  __typename?: 'SnarkFees';
  average?: Maybe<Scalars['Float']['output']>;
  maxFee?: Maybe<Scalars['Float']['output']>;
  minFee?: Maybe<Scalars['Float']['output']>;
};

export type SourceReceiver = {
  __typename?: 'SourceReceiver';
  publicKey?: Maybe<Scalars['String']['output']>;
};

export type Tickers = {
  __typename?: 'Tickers';
  BTCMINA?: Maybe<Scalars['String']['output']>;
  USDTMINA?: Maybe<Scalars['String']['output']>;
};

export type Transaction = {
  __typename?: 'Transaction';
  amount?: Maybe<Scalars['String']['output']>;
  command_type: Scalars['String']['output'];
  failure_reason?: Maybe<Scalars['String']['output']>;
  fee: Scalars['String']['output'];
  fee_payer_id: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  id: Scalars['String']['output'];
  memo?: Maybe<Scalars['String']['output']>;
  nonce: Scalars['String']['output'];
  receiver_id?: Maybe<Scalars['String']['output']>;
  receiver_public_key?: Maybe<Scalars['String']['output']>;
  sender_public_key: Scalars['String']['output'];
  source_id: Scalars['String']['output'];
  status?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['String']['output'];
  valid_until?: Maybe<Scalars['String']['output']>;
};

export type TransactionsCount = {
  __typename?: 'TransactionsCount';
  count?: Maybe<Scalars['Int']['output']>;
};

export type Validator = {
  __typename?: 'Validator';
  deletorsNum?: Maybe<Scalars['String']['output']>;
  discordGroup?: Maybe<Scalars['String']['output']>;
  discordUsername?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  fee?: Maybe<Scalars['String']['output']>;
  github?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  payoutTerms?: Maybe<Scalars['String']['output']>;
  priority: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
  publicKey: Scalars['String']['output'];
  stakePercent?: Maybe<Scalars['String']['output']>;
  stakedSum?: Maybe<Scalars['String']['output']>;
  telegram?: Maybe<Scalars['String']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type ValidatorsCount = {
  __typename?: 'ValidatorsCount';
  count?: Maybe<Scalars['Int']['output']>;
};

export type AccountByKeyQueryVariables = Exact<{
  publicKey: Scalars['String']['input'];
}>;


export type AccountByKeyQuery = { __typename?: 'Query', accountByKey?: { __typename?: 'Account', balance?: { __typename?: 'Balance', total?: string | null, liquid?: string | null, locked?: string | null, liquidUnconfirmed?: string | null, unconfirmedTotal?: string | null } | null } | null };




export const AccountByKeyDocument = gql`
    query accountByKey($publicKey: String!) {
  accountByKey(publicKey: $publicKey) {
    balance {
      total
      liquid
      locked
      liquidUnconfirmed
      unconfirmedTotal
    }
  }
}
    `;

/**
 * __useAccountByKeyQuery__
 *
 * To run a query within a React component, call `useAccountByKeyQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccountByKeyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountByKeyQuery({
 *   variables: {
 *      publicKey: // value for 'publicKey'
 *   },
 * });
 */
export function useAccountByKeyQuery(baseOptions: ApolloReactHooks.QueryHookOptions<AccountByKeyQuery, AccountByKeyQueryVariables> & ({ variables: AccountByKeyQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AccountByKeyQuery, AccountByKeyQueryVariables>(AccountByKeyDocument, options);
      }
export function useAccountByKeyLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AccountByKeyQuery, AccountByKeyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AccountByKeyQuery, AccountByKeyQueryVariables>(AccountByKeyDocument, options);
        }
// @ts-ignore
// export function useAccountByKeySuspenseQuery(baseOptions?: ApolloReactHooks.SuspenseQueryHookOptions<AccountByKeyQuery, AccountByKeyQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<AccountByKeyQuery, AccountByKeyQueryVariables>;
// export function useAccountByKeySuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<AccountByKeyQuery, AccountByKeyQueryVariables>): ApolloReactHooks.UseSuspenseQueryResult<AccountByKeyQuery | undefined, AccountByKeyQueryVariables>;
// export function useAccountByKeySuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<AccountByKeyQuery, AccountByKeyQueryVariables>) {
//           const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
//           return ApolloReactHooks.useSuspenseQuery<AccountByKeyQuery, AccountByKeyQueryVariables>(AccountByKeyDocument, options);
//         }
export type AccountByKeyQueryHookResult = ReturnType<typeof useAccountByKeyQuery>;
export type AccountByKeyLazyQueryHookResult = ReturnType<typeof useAccountByKeyLazyQuery>;
// export type AccountByKeySuspenseQueryHookResult = ReturnType<typeof useAccountByKeySuspenseQuery>;
export type AccountByKeyQueryResult = ApolloReactCommon.QueryResult<AccountByKeyQuery, AccountByKeyQueryVariables>;
