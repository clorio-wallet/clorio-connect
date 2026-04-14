/**
 * Content Script Bridge
 *
 * Acts as a secure bridge between the inpage script (injected into page context)
 * and the background service worker. Handles message relay with origin validation.
 *
 * Security model:
 * - Origin is determined by browser (event.origin), cannot be spoofed
 * - All messages validated before forwarding
 * - No sensitive data stored or processed in content script
 */

// @ts-ignore - Vite-specific import
import inpageUrl from '../inpage/index.ts?script&module';

import type { DappBridgeRequest, DappBridgeResponse } from '@/lib/dapp';
import { DAPP_BRIDGE_CHANNEL, DAPP_ERROR_CODES } from '@/lib/dapp';
import type { DappRpcResponse } from '@/messages/types';

console.log('Content script loaded');

// Inject inpage script
const script = document.createElement('script');
script.src = chrome.runtime.getURL(inpageUrl);
script.type = 'module';
(document.head || document.documentElement).appendChild(script);
script.addEventListener('load', () => script.remove());

function getPageIconUrl(): string | undefined {
  const icon = document.querySelector<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"]',
  );

  if (icon?.href) {
    return icon.href;
  }

  try {
    return new URL('/favicon.ico', window.location.origin).toString();
  } catch {
    return undefined;
  }
}

function postResponse(response: DappBridgeResponse): void {
  window.postMessage(response, window.location.origin);
}

window.addEventListener(
  'message',
  async (event: MessageEvent<DappBridgeRequest>) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (
      !data ||
      data.channel !== DAPP_BRIDGE_CHANNEL ||
      data.direction !== 'request'
    ) {
      return;
    }

    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'DAPP_RPC_REQUEST',
        payload: {
          id: data.id,
          method: data.method,
          params: data.params,
          site: {
            origin: window.location.origin,
            title: document.title,
            iconUrl: getPageIconUrl(),
          },
        },
      })) as DappRpcResponse;

      postResponse({
        channel: DAPP_BRIDGE_CHANNEL,
        direction: 'response',
        id: data.id,
        result: response?.result,
        error: response?.error,
      });
    } catch (error) {
      postResponse({
        channel: DAPP_BRIDGE_CHANNEL,
        direction: 'response',
        id: data.id,
        error: {
          code: DAPP_ERROR_CODES.internalError,
          message:
            error instanceof Error
              ? error.message
              : 'Wallet bridge is unavailable.',
        },
      });
    }
  },
);
