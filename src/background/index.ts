import "./sidepanel";
import Client from 'mina-signer';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';
import { AppMessage, DeriveKeysResponse } from '@/messages/types';

console.log("Clorio Background Service Worker Running");

// Initialize client once in background
const client = new Client({ network: 'mainnet' });

chrome.runtime.onInstalled.addListener(() => {
  console.log("Clorio Extension Installed");
});

chrome.runtime.onMessage.addListener((
  message: AppMessage,
  sender,
  sendResponse: (response: DeriveKeysResponse | { error: string }) => void
) => {
  if (message.type === 'DERIVE_KEYS_FROM_MNEMONIC') {
    (async () => {
      try {
        const { mnemonic } = message.payload;
        const privateKey = await deriveMinaPrivateKey(mnemonic);
        const publicKey = client.derivePublicKey(privateKey);
        
        sendResponse({
          privateKey,
          publicKey
        });
      } catch (error) {
        console.error('Key derivation failed in background:', error);
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

