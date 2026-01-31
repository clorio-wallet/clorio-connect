import "./sidepanel";
import Client from 'mina-signer';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';
import { AppMessage, DeriveKeysResponse, ValidatePrivateKeyResponse } from '@/messages/types';

console.log("Clorio Background Service Worker Running");

// Initialize client once in background
const client = new Client({ network: 'mainnet' });

chrome.runtime.onInstalled.addListener(() => {
  console.log("Clorio Extension Installed");
});

chrome.runtime.onMessage.addListener((
  message: AppMessage,
  sender,
  sendResponse: (response: DeriveKeysResponse | ValidatePrivateKeyResponse | { error: string } | { success: boolean }) => void
) => {
  if (message.type === 'UPDATE_LOCK_STATUS') {
    const { isLocked } = message.payload;
    if (isLocked) {
      chrome.action.setBadgeText({ text: '🔒' });
      chrome.action.setBadgeBackgroundColor({ color: '#333333' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
    sendResponse({ success: true });
    return;
  }

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
});

