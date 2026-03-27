// Mock transaction data for testing all states
// This file is gitignored - safe for sensitive test data

import type { Transaction } from '@/api/mina/transactions';

export const mockTransactions: Transaction[] = [
  // === PENDING PAYMENTS ===
  {
    id: 'tx-pending-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN8',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 100.5,
    fee: 0.1,
    timestamp: Math.floor(new Date().getTime() / 1000),
    status: 'pending',
    isIncoming: false,
    memo: 'Test pending payment',
  },
  {
    id: 'tx-pending-receive-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN9',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD7',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 250.75,
    fee: 0.1,
    timestamp: new Date(Date.now() - 60000).getTime() / 1000,
    status: 'pending',
    isIncoming: true,
  },

  // === CONFIRMED PAYMENTS ===
  {
    id: 'tx-confirmed-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN1',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 50.25,
    fee: 0.1,
    timestamp: new Date(Date.now() - 3600000).getTime() / 1000,
    status: 'applied',
    isIncoming: false,
    memo: 'Payment confirmed',
    blockHeight: 1500000,
  },
  {
    id: 'tx-confirmed-receive-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN2',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD8',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 1000.0,
    fee: 0.1,
    timestamp: new Date(Date.now() - 86400000).getTime() / 1000,
    status: 'applied',
    isIncoming: true,
    blockHeight: 1499990,
  },

  // === FAILED PAYMENTS ===
  {
    id: 'tx-failed-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN3',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 999999.99,
    fee: 0.1,
    timestamp: new Date(Date.now() - 172800000).getTime() / 1000,
    status: 'failed',
    isIncoming: false,
  },

  // === DELEGATION - PENDING ===
  {
    id: 'delegation-pending-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN4',
    type: 'delegation',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 0,
    fee: 0.1,
    timestamp: new Date(Date.now() - 120000).getTime() / 1000,
    status: 'pending',
    isIncoming: false,
  },

  // === DELEGATION - CONFIRMED ===
  {
    id: 'delegation-confirmed-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN5',
    type: 'delegation',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 0,
    fee: 0.1,
    timestamp: new Date(Date.now() - 604800000).getTime() / 1000,
    status: 'applied',
    isIncoming: false,
    blockHeight: 1495000,
  },

  // === DELEGATION - FAILED ===
  {
    id: 'delegation-failed-1',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN6',
    type: 'delegation',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 0,
    fee: 0.1,
    timestamp: new Date(Date.now() - 1209600000).getTime() / 1000,
    status: 'failed',
    isIncoming: false,
  },

  // === EDGE CASES ===
  {
    id: 'tx-long-memo',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN7',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 10.0,
    fee: 0.1,
    timestamp: new Date(Date.now() - 259200000).getTime() / 1000,
    status: 'applied',
    isIncoming: false,
    memo: 'This is a very long memo that should test text overflow handling in the transaction card component',
    blockHeight: 1498000,
  },
  {
    id: 'tx-old',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN8',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 0.000001,
    fee: 0.1,
    timestamp: new Date(Date.now() - 31536000000).getTime() / 1000,
    status: 'applied',
    isIncoming: false,
    blockHeight: 1000000,
  },
  {
    id: 'tx-high-value',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bN9',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 9999999.999999,
    fee: 0.1,
    timestamp: new Date(Date.now() - 432000000).getTime() / 1000,
    status: 'applied',
    isIncoming: false,
    blockHeight: 1497000,
  },
  {
    id: 'tx-no-memo',
    hash: '5JuriS2G5TmT4vF5qT1mZ1qW9sL8kX3cP6dH9rT2eM7uA4bO1',
    type: 'payment',
    sender: 'B62qk5o6X7qL2Y3w8h4vV1cK9sT6eR3gP7mH2tN5uA9bF4cD6',
    receiver: 'B62qmM5o6X8kL3w9v4hT2cK8sT6eR3gP7mH2tN5uA9bF4cD6uM8',
    amount: 25.0,
    fee: 0.1,
    timestamp: new Date(Date.now() - 7200000).getTime() / 1000,
    status: 'applied',
    isIncoming: true,
    blockHeight: 1499500,
  },
];

// Export helpers
export const mockTransactionsByStatus = {
  pending: mockTransactions.filter((tx) => tx.status === 'pending'),
  applied: mockTransactions.filter((tx) => tx.status === 'applied'),
  failed: mockTransactions.filter((tx) => tx.status === 'failed'),
};

export const mockTransactionsByKind = {
  payment: mockTransactions.filter((tx) => tx.type === 'payment'),
  delegation: mockTransactions.filter((tx) => tx.type === 'delegation'),
};

// Helper to get a transaction by hash
export const getMockTransactionByHash = (
  hash: string,
): Transaction | undefined => {
  return mockTransactions.find((tx) => tx.hash === hash);
};
