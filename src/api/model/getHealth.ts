
import type { GetHealthEpoch } from './getHealthEpoch';
import type { GetHealthSlot } from './getHealthSlot';

export interface GetHealth {
  status: string;
  db: string;
  blockchainLength: number;
  syncStatus: string;
  chainId: string;
  epoch: GetHealthEpoch;
  slot: GetHealthSlot;
}
