import { gql } from '@apollo/client';

// GraphQL mutation for broadcasting a signed payment transaction.  
// Codegen will pick this up and generate a `useBroadcastTransactionMutation` hook.
export const BROADCAST_TRANSACTION = gql`
  mutation BroadcastTransaction($input: SendPaymentInput!, $signature: SignatureInput) {
    broadcastTransaction(input: $input, signature: $signature) {
      id
      hash
      fee
      amount
    }
  }
`;
