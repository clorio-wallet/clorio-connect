import { gql } from '@apollo/client';

export const GET_BALANCE = gql`
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

export const GET_ID = gql`
  query GetIDFromPublicKey($publicKey: String!) {
    idByPublicKey(publicKey: $publicKey) {
      id
    }
  }
`;
