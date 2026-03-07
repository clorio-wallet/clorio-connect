/**
 * handlers/ledger.ts
 *
 * Handles all Ledger-related background messages:
 *   - SW keepalive (prevents the service worker from being terminated while
 *     the user is confirming an operation on the physical device)
 *   - LEDGER_IMPORT_ACCOUNT  — persists the imported public key/metadata
 *   - LEDGER_SUBMIT_PAYMENT  — broadcasts a signed payment (TODO: GraphQL)
 *   - LEDGER_SUBMIT_DELEGATION — broadcasts a signed delegation (TODO: GraphQL)
 */

import { storage } from '@/lib/storage';
import type {
  LedgerImportAccountResponse,
  LedgerSubmitTxResponse,
} from '@/messages/types';

// ─── REST helpers ─────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? '';

async function restPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerAccount {
  address: string;
  accountName: string;
  accountIndex: number;
  type: 'ledger';
}

// ─── SW keepalive ─────────────────────────────────────────────────────────────
// The service worker is terminated after ~30 s of inactivity.
// While the user is confirming a Ledger operation on the device we keep it
// alive with a periodic no-op triggered by the popup.

let _keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export function startKeepalive(): void {
  if (_keepAliveInterval) return;
  _keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
  }, 20_000);
}

export function stopKeepalive(): void {
  if (_keepAliveInterval) {
    clearInterval(_keepAliveInterval);
    _keepAliveInterval = null;
  }
}

// ─── Import account ───────────────────────────────────────────────────────────

export async function handleImportAccount(
  payload: { publicKey: string; accountIndex: number; accountName: string },
  sendResponse: (r: LedgerImportAccountResponse) => void,
): Promise<void> {
  try {
    const account: LedgerAccount = {
      address: payload.publicKey,
      accountName: payload.accountName,
      accountIndex: payload.accountIndex,
      type: 'ledger',
    };

    await storage.set('clorio_ledger_account', account);
    console.log('[ledger] Account saved:', account);

    sendResponse({ success: true, account });
  } catch (error) {
    console.error('[ledger] LEDGER_IMPORT_ACCOUNT failed:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save account',
    });
  }
}

// ─── Submit payment ───────────────────────────────────────────────────────────

export async function handleSubmitPayment(
  payload: {
    signature: string;
    from: string;
    to: string;
    amount: number;
    fee: number;
    nonce: number;
    memo: string;
    validUntil: number;
  },
  sendResponse: (r: LedgerSubmitTxResponse) => void,
): Promise<void> {
  try {
    const { signature, from, to, amount, fee, nonce, memo, validUntil } = payload;

    console.log('[ledger] LEDGER_SUBMIT_PAYMENT broadcasting:', {
      from, to, amount, fee, nonce, memo, validUntil, signature,
    });

    const result = await restPost<{ hash: string }>('/v1/mina/transactions/payment', {
      input: {
        from, to,
        amount: amount.toString(),
        fee: fee.toString(),
        nonce: nonce.toString(),
        memo,
        validUntil: validUntil.toString(),
      },
      signature,
    });

    sendResponse({ success: true, hash: result.hash });
  } catch (error) {
    console.error('[ledger] LEDGER_SUBMIT_PAYMENT failed:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Broadcast failed',
    });
  }
}

// ─── Submit delegation ────────────────────────────────────────────────────────

export async function handleSubmitDelegation(
  payload: {
    signature: string;
    from: string;
    to: string;
    fee: number;
    nonce: number;
    memo: string;
    validUntil: number;
  },
  sendResponse: (r: LedgerSubmitTxResponse) => void,
): Promise<void> {
  try {
    const { signature, from, to, fee, nonce, memo, validUntil } = payload;

    console.log('[ledger] LEDGER_SUBMIT_DELEGATION broadcasting:', {
      from, to, fee, nonce, memo, validUntil, signature,
    });

    const result = await restPost<{ hash: string }>('/v1/mina/transactions/delegation', {
      input: {
        from, to,
        fee: fee.toString(),
        nonce: nonce.toString(),
        memo,
        validUntil: validUntil.toString(),
      },
      signature,
    });

    sendResponse({ success: true, hash: result.hash });
  } catch (error) {
    console.error('[ledger] LEDGER_SUBMIT_DELEGATION failed:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Broadcast failed',
    });
  }
}
