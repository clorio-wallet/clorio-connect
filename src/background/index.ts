import './sidepanel';
import Client from 'mina-signer';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';
import {
  AppMessage,
  DeriveKeysResponse,
  ValidatePrivateKeyResponse,
  SignDelegationResponse,
} from '@/messages/types';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';

interface VaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type?: 'mnemonic' | 'privateKey';
}

async function getPrivateKeyFromVault(password: string): Promise<string> {
  const vault = await storage.get<VaultData>('clorio_vault');

  if (!vault) {
    throw new Error('No wallet vault found in storage');
  }

  const decrypted = await CryptoService.decrypt(
    vault.encryptedSeed,
    password,
    vault.salt,
    vault.iv,
  );

  // If the vault stores a mnemonic, derive the private key from it
  if (!vault.type || vault.type === 'mnemonic') {
    return deriveMinaPrivateKey(decrypted);
  }

  // Otherwise the vault stores the private key directly
  return decrypted;
}

console.log('Clorio Background Service Worker Running');

// Initialize client once in background
const client = new Client({ network: 'mainnet' });

chrome.runtime.onInstalled.addListener(() => {
  console.log('Clorio Extension Installed');
});

chrome.runtime.onMessage.addListener(
  (
    message: AppMessage,
    sender,
    sendResponse: (
      response:
        | DeriveKeysResponse
        | ValidatePrivateKeyResponse
        | SignDelegationResponse
        | { error: string },
    ) => void,
  ) => {
    if (message.type === 'DERIVE_KEYS_FROM_MNEMONIC') {
      (async () => {
        try {
          const { mnemonic } = message.payload;
          const privateKey = await deriveMinaPrivateKey(mnemonic);
          const publicKey = client.derivePublicKey(privateKey);

          sendResponse({
            privateKey,
            publicKey,
          });
        } catch (error) {
          console.error('Key derivation failed in background:', error);
          sendResponse({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();

      // Return true to indicate we will send a response asynchronously
      return true;
    }

    if (message.type === 'VALIDATE_PRIVATE_KEY') {
      try {
        const { privateKey } = message.payload;
        const publicKey = client.derivePublicKey(privateKey);
        sendResponse({ isValid: true, publicKey });
      } catch (error) {
        console.error('Private key validation failed:', error);
        sendResponse({ isValid: false, error: 'Invalid private key' });
      }
    }

    if (message.type === 'SIGN_DELEGATION') {
      (async () => {
        try {
          const { delegation, password } = message.payload;

          // Derive the private key from the encrypted vault
          const privateKey = await getPrivateKeyFromVault(password);

          // Build the stake delegation payload for mina-signer
          const stakeDelegation = {
            from: delegation.from,
            to: delegation.to,
            fee: delegation.fee,
            nonce: delegation.nonce,
            memo: delegation.memo ?? '',
          };

          console.log('[SIGN_DELEGATION] Signing stake delegation:', {
            from: stakeDelegation.from,
            to: stakeDelegation.to,
            fee: stakeDelegation.fee,
            nonce: stakeDelegation.nonce,
            memo: stakeDelegation.memo,
          });

          const signed = client.signStakeDelegation(
            stakeDelegation,
            privateKey,
          );

          console.log('[SIGN_DELEGATION] Signed stake delegation:', {
            data: signed.data,
            signature: signed.signature,
          });

          sendResponse({ signature: signed.signature });
        } catch (error) {
          console.error('[SIGN_DELEGATION] Signing failed:', error);
          sendResponse({
            error: error instanceof Error ? error.message : 'Signing failed',
          });
        }
      })();

      return true;
    }
  },
);
