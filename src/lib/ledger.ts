/**
 * ledger.ts
 *
 * Ledger hardware wallet integration for the Mina protocol.
 *
 * Architecture (follows Auro Wallet's proven pattern):
 *
 *   TransportWebUSB.create()  →  MinaLedgerJS  →  getAddress / signTransaction
 *
 * The official @ledgerhq/hw-transport-webusb library handles ALL WebUSB
 * communication (device selection, HID framing, endpoint management, etc.).
 * We do NOT hand-roll any HID framing or APDU proxying.
 *
 * IMPORTANT: WebUSB requires a user-visible top-level tab context.
 * navigator.usb.requestDevice() cannot be called from the extension popup
 * or service worker. The Ledger import page must be opened in a regular
 * browser tab (via chrome.tabs.create) for the USB picker to work.
 *
 * Once Transport.create() succeeds in a tab context, the transport remains
 * usable for the lifetime of that tab — no need to relay APDUs through the
 * background service worker.
 *
 * Libraries used (all already in package.json — no new dependencies):
 *   - @ledgerhq/hw-transport-webusb  (USB transport)
 *   - @ledgerhq/devices              (vendor ID constants)
 *   - mina-ledger-js                 (Mina APDU commands)
 */

import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { MinaLedgerJS } from 'mina-ledger-js';
import type Transport from '@ledgerhq/hw-transport';

// ─── Errors ───────────────────────────────────────────────────────────────────

export enum LedgerErrorKind {
  DISCONNECTED = 'DISCONNECTED',
  APP_NOT_OPEN = 'APP_NOT_OPEN',
  REJECTED = 'REJECTED',
  SIGN_FAILED = 'SIGN_FAILED',
}

export class LedgerError extends Error {
  readonly kind: LedgerErrorKind;

  constructor(kind: LedgerErrorKind, message: string) {
    super(message);
    this.name = 'LedgerError';
    this.kind = kind;
  }

  static disconnected(msg?: string): LedgerError {
    return new LedgerError(
      LedgerErrorKind.DISCONNECTED,
      msg ?? 'Ledger not found. Make sure the device is connected via USB.',
    );
  }
  static appNotOpen(msg?: string): LedgerError {
    return new LedgerError(
      LedgerErrorKind.APP_NOT_OPEN,
      msg ?? 'Open the Mina app on your Ledger and try again.',
    );
  }
  static rejected(msg?: string): LedgerError {
    return new LedgerError(
      LedgerErrorKind.REJECTED,
      msg ?? 'Operation rejected on device.',
    );
  }
  static signFailed(msg?: string): LedgerError {
    return new LedgerError(
      LedgerErrorKind.SIGN_FAILED,
      msg ?? 'Signing failed.',
    );
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MINA_DECIMALS = 9;
const VALID_UNTIL_MAX = 4294967295;

/**
 * Timeout for pinging the Ledger to check if the Mina app is open.
 * Auro uses 300 ms; we use a slightly more generous value to account
 * for slower USB hubs and older firmware.
 */
const PING_TIMEOUT_MS = 3000;

const ReturnCode = {
  SUCCESS: '9000',
  USER_REJECTED: '6986',
  APP_NOT_OPEN: '5000',
} as const;

function isSuccess(code: string): boolean {
  return code === ReturnCode.SUCCESS;
}

export const NetworkId = {
  MAINNET: 0x01,
  DEVNET: 0x00,
} as const;

export const TxType = {
  PAYMENT: 0x00,
  DELEGATION: 0x04,
} as const;

// ─── Public types ─────────────────────────────────────────────────────────────

export type LedgerNetworkId = (typeof NetworkId)[keyof typeof NetworkId];

export enum LedgerStatus {
  READY = 'READY',
  DISCONNECTED = 'DISCONNECTED',
  APP_NOT_OPEN = 'APP_NOT_OPEN',
}

export interface LedgerConnectionResult {
  status: LedgerStatus;
  app: MinaLedgerJS | null;
}

export interface LedgerAddressResult {
  publicKey: string | null;
  rejected: boolean;
  error?: string;
}

export interface LedgerSignResult {
  signature: string | null;
  payload: SignedPayload | null;
  rejected: boolean;
  error?: string;
}

export interface SignedPayload {
  from: string;
  to: string;
  amount: number;
  fee: number;
  nonce: number;
  memo: string;
  validUntil: number;
}

export interface PaymentParams {
  fromAddress: string;
  toAddress: string;
  amount: string | number;
  fee: string | number;
  nonce: number;
  memo?: string;
  networkId: LedgerNetworkId;
}

export interface DelegationParams {
  fromAddress: string;
  toAddress: string;
  fee: string | number;
  nonce: number;
  memo?: string;
  networkId: LedgerNetworkId;
}

// ─── Transport singleton ──────────────────────────────────────────────────────
//
// Mirrors Auro's approach: module-level singletons for the transport and app
// instances. They survive for the lifetime of the page/tab. If the connection
// is lost, we null them out and the next call will re-create.

let _transport: Transport | null = null;
let _app: MinaLedgerJS | null = null;

/**
 * Close the current transport and null out both singletons.
 * Safe to call even if already disconnected.
 */
async function resetConnection(): Promise<void> {
  _app = null;
  if (_transport) {
    try {
      await _transport.close();
    } catch {
      /* ignore — transport may already be closed */
    }
    _transport = null;
  }
}

// ─── Transport creation (Auro pattern) ────────────────────────────────────────

/**
 * Get or create a WebUSB transport to the Ledger device.
 *
 * This calls TransportWebUSB.create() which:
 *   1. Enumerates previously-granted USB devices (navigator.usb.getDevices)
 *   2. If none found, shows the browser USB picker (navigator.usb.requestDevice)
 *   3. Opens the device, claims the HID interface, handles framing
 *
 * Must be called from a user-visible tab (not popup, not service worker).
 *
 * Returns null if the user cancels or no device is available.
 */
async function getTransport(): Promise<Transport | null> {
  if (_transport) return _transport;

  try {
    const transport = await TransportWebUSB.create();
    _transport = transport;

    // Listen for disconnect so we can clean up our singletons.
    transport.on('disconnect', () => {
      console.log('[ledger] Transport disconnected');
      _transport = null;
      _app = null;
    });

    return transport;
  } catch (err) {
    console.warn('[ledger] TransportWebUSB.create() failed:', err);
    return null;
  }
}

/**
 * Get or create a MinaLedgerJS app instance backed by the current transport.
 *
 * Returns { app, manualConnected } following Auro's convention:
 *   - app: the MinaLedgerJS instance (or null if connection failed)
 *   - manualConnected: true if the user needs to manually connect the device
 */
async function getApp(): Promise<{
  app: MinaLedgerJS | null;
  manualConnected: boolean;
}> {
  // If we have an existing app, verify it's still alive.
  if (_app) {
    try {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const result = await Promise.race<{
        name?: string;
        returnCode: string;
        timeout?: boolean;
      }>([
        _app.getAppName(),
        new Promise((resolve) => {
          timer = setTimeout(
            () => resolve({ returnCode: 'timeout', timeout: true }),
            PING_TIMEOUT_MS,
          );
        }),
      ]);

      if (timer) clearTimeout(timer);

      if (
        result.returnCode === ReturnCode.APP_NOT_OPEN ||
        !result.name ||
        result.timeout
      ) {
        // App is stale — close and retry.
        await resetConnection();
        return { app: null, manualConnected: true };
      }

      return { app: _app, manualConnected: false };
    } catch {
      await resetConnection();
      return { app: null, manualConnected: true };
    }
  }

  // No existing app — try to create a transport.
  const transport = await getTransport();
  if (!transport) {
    return { app: null, manualConnected: true };
  }

  const app = new MinaLedgerJS(
    transport as unknown as ConstructorParameters<typeof MinaLedgerJS>[0],
  );

  // Verify the Mina app is actually open on the device.
  try {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const result = await Promise.race<{
      name?: string;
      returnCode: string;
      timeout?: boolean;
    }>([
      app.getAppName(),
      new Promise((resolve) => {
        timer = setTimeout(
          () => resolve({ returnCode: 'timeout', timeout: true }),
          PING_TIMEOUT_MS,
        );
      }),
    ]);

    if (timer) clearTimeout(timer);

    if (
      result.returnCode === ReturnCode.APP_NOT_OPEN ||
      !result.name ||
      result.timeout
    ) {
      await resetConnection();
      return { app: null, manualConnected: true };
    }

    _app = app;
    return { app, manualConnected: false };
  } catch {
    await resetConnection();
    return { app: null, manualConnected: true };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Ensure WebUSB permission has been granted for a Ledger device.
 *
 * On first call in a tab, this may show the browser's USB device picker.
 * On subsequent calls (same tab, same browser session), it reuses the
 * previously-granted device without showing the picker.
 *
 * Returns true if a device is available, false if the user cancelled or
 * no device was found.
 *
 * NOTE: This must be called from a user-visible tab page, NOT from the
 * extension popup or service worker.
 */
export async function requestLedgerPermission(): Promise<boolean> {
  if (_transport !== null) return true;

  console.log('[ledger] Requesting USB permission (TransportWebUSB.create)...');

  const transport = await getTransport();
  if (!transport) {
    console.warn('[ledger] USB permission not granted or device not found');
    return false;
  }

  console.log('[ledger] USB permission granted, transport ready');
  return true;
}

/**
 * Checks whether the Ledger is connected and the Mina app is open.
 * Returns READY + app instance on success, or the specific failure status.
 *
 * This is the primary entry point for the UI to determine Ledger readiness.
 * It does NOT show the USB picker — call requestLedgerPermission() first
 * if the user hasn't granted access yet.
 */
export async function checkLedgerStatus(): Promise<LedgerConnectionResult> {
  console.log(
    '[ledger] checkLedgerStatus — transport:',
    _transport ? 'present' : 'null',
    '| app:',
    _app ? 'present' : 'null',
  );

  // If we already have a healthy transport + app, ping to confirm liveness.
  if (_transport !== null && _app !== null) {
    try {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const ping = await Promise.race<{
        name?: string;
        returnCode: string;
        timeout?: boolean;
      }>([
        _app.getAppName(),
        new Promise((resolve) => {
          timer = setTimeout(
            () => resolve({ returnCode: 'timeout', timeout: true }),
            PING_TIMEOUT_MS,
          );
        }),
      ]);

      if (timer) clearTimeout(timer);

      if (!ping.timeout && isSuccess(ping.returnCode) && ping.name === 'Mina') {
        console.log('[ledger] checkLedgerStatus → READY (existing app OK)');
        return { status: LedgerStatus.READY, app: _app };
      }

      console.warn(
        '[ledger] checkLedgerStatus — ping failed, resetting. returnCode:',
        ping.returnCode,
        'name:',
        ping.name,
        'timeout:',
        ping.timeout,
      );
      await resetConnection();
    } catch (e) {
      console.warn('[ledger] checkLedgerStatus — ping threw:', e);
      await resetConnection();
    }
  }

  // No healthy connection — try to establish one.
  if (_transport === null) {
    // Try to reconnect silently (uses previously-granted device).
    const transport = await getTransport();
    if (!transport) {
      console.warn('[ledger] checkLedgerStatus → DISCONNECTED (no transport)');
      return { status: LedgerStatus.DISCONNECTED, app: null };
    }
  }

  // Transport is available — try to open the Mina app.
  const { app } = await getApp();

  if (app) {
    console.log('[ledger] checkLedgerStatus → READY');
    return { status: LedgerStatus.READY, app };
  }

  // Transport exists but the app isn't responding — classify the error.
  // If we still have a transport the device is connected but the app
  // isn't open. If the transport was cleaned up, the device is gone.
  if (_transport) {
    console.warn('[ledger] checkLedgerStatus → APP_NOT_OPEN');
    return { status: LedgerStatus.APP_NOT_OPEN, app: null };
  }

  console.warn('[ledger] checkLedgerStatus → DISCONNECTED');
  return { status: LedgerStatus.DISCONNECTED, app: null };
}

/**
 * Reads the public address for the given account index from the device.
 * The device will display the address and wait for user confirmation.
 */
export async function getLedgerAddress(
  app: MinaLedgerJS,
  accountIndex: number,
): Promise<LedgerAddressResult> {
  console.log('[ledger] getLedgerAddress — accountIndex:', accountIndex);
  try {
    const { publicKey, returnCode, statusText } =
      await app.getAddress(accountIndex);

    console.log(
      '[ledger] getLedgerAddress — returnCode:',
      returnCode,
      '| publicKey:',
      publicKey ? publicKey.slice(0, 12) + '…' : 'null',
    );

    if (returnCode === ReturnCode.USER_REJECTED) {
      return {
        publicKey: null,
        rejected: true,
        error: 'Operation rejected on device',
      };
    }

    if (!isSuccess(returnCode) || !publicKey) {
      return {
        publicKey: null,
        rejected: false,
        error: statusText ?? 'Failed to read address',
      };
    }

    return { publicKey, rejected: false };
  } catch (e) {
    console.error('[ledger] getLedgerAddress — threw:', e);
    return {
      publicKey: null,
      rejected: false,
      error: e instanceof Error ? e.message : 'Communication error',
    };
  }
}

/**
 * Get the full Ledger status including the app instance, following Auro's
 * getLedgerStatus() pattern. Useful for checking readiness before signing.
 */
export async function getLedgerStatus(): Promise<{
  status: LedgerStatus;
  app: MinaLedgerJS | null;
}> {
  return checkLedgerStatus();
}

// ─── Signing helpers ──────────────────────────────────────────────────────────

function toNanoMina(amount: string | number): number {
  return Math.round(Number(amount) * Math.pow(10, MINA_DECIMALS));
}

function reverseHexBytes(hex: string): string {
  return (hex.match(/.{2}/g) ?? []).reverse().join('');
}

/**
 * The Ledger firmware returns the Schnorr signature in little-endian.
 * The Mina node expects big-endian for both components — byte-swap each.
 */
function reEncodeSignature(raw: string): string {
  if (raw.length !== 128)
    throw new Error(`Invalid signature length: ${raw.length}`);
  return reverseHexBytes(raw.slice(0, 64)) + reverseHexBytes(raw.slice(64));
}

// ─── Sign payment ─────────────────────────────────────────────────────────────

export async function signLedgerPayment(
  app: MinaLedgerJS,
  params: PaymentParams,
  accountIndex: number,
): Promise<LedgerSignResult> {
  const memo = params.memo ?? '';
  if (memo.length > 32) {
    return {
      signature: null,
      payload: null,
      rejected: false,
      error: 'Memo cannot exceed 32 characters',
    };
  }

  const feeNano = toNanoMina(params.fee);
  if (feeNano < 1_000_000) {
    return {
      signature: null,
      payload: null,
      rejected: false,
      error: 'Fee too low (minimum 0.001 MINA)',
    };
  }

  const amountNano = toNanoMina(params.amount);

  try {
    const { signature, returnCode, statusText } = await app.signTransaction({
      txType: TxType.PAYMENT,
      senderAccount: accountIndex,
      senderAddress: params.fromAddress,
      receiverAddress: params.toAddress,
      amount: amountNano,
      fee: feeNano,
      nonce: params.nonce,
      memo,
      networkId: params.networkId,
      validUntil: VALID_UNTIL_MAX,
    });

    if (returnCode === ReturnCode.USER_REJECTED) {
      return { signature: null, payload: null, rejected: true };
    }
    if (!isSuccess(returnCode) || !signature) {
      return {
        signature: null,
        payload: null,
        rejected: false,
        error: statusText ?? 'Signing error',
      };
    }

    return {
      signature: reEncodeSignature(signature),
      payload: {
        from: params.fromAddress,
        to: params.toAddress,
        amount: amountNano,
        fee: feeNano,
        nonce: params.nonce,
        memo,
        validUntil: VALID_UNTIL_MAX,
      },
      rejected: false,
    };
  } catch (e) {
    return {
      signature: null,
      payload: null,
      rejected: false,
      error: e instanceof Error ? e.message : 'Communication error',
    };
  }
}

// ─── Sign delegation ──────────────────────────────────────────────────────────

export async function signLedgerDelegation(
  app: MinaLedgerJS,
  params: DelegationParams,
  accountIndex: number,
): Promise<LedgerSignResult> {
  const memo = params.memo ?? '';
  if (memo.length > 32) {
    return {
      signature: null,
      payload: null,
      rejected: false,
      error: 'Memo cannot exceed 32 characters',
    };
  }

  const feeNano = toNanoMina(params.fee);
  if (feeNano < 1_000_000) {
    return {
      signature: null,
      payload: null,
      rejected: false,
      error: 'Fee too low (minimum 0.001 MINA)',
    };
  }

  try {
    const { signature, returnCode, statusText } = await app.signTransaction({
      txType: TxType.DELEGATION,
      senderAccount: accountIndex,
      senderAddress: params.fromAddress,
      receiverAddress: params.toAddress,
      amount: 0,
      fee: feeNano,
      nonce: params.nonce,
      memo,
      networkId: params.networkId,
      validUntil: VALID_UNTIL_MAX,
    });

    if (returnCode === ReturnCode.USER_REJECTED) {
      return { signature: null, payload: null, rejected: true };
    }
    if (!isSuccess(returnCode) || !signature) {
      return {
        signature: null,
        payload: null,
        rejected: false,
        error: statusText ?? 'Signing error',
      };
    }

    return {
      signature: reEncodeSignature(signature),
      payload: {
        from: params.fromAddress,
        to: params.toAddress,
        amount: 0,
        fee: feeNano,
        nonce: params.nonce,
        memo,
        validUntil: VALID_UNTIL_MAX,
      },
      rejected: false,
    };
  } catch (e) {
    return {
      signature: null,
      payload: null,
      rejected: false,
      error: e instanceof Error ? e.message : 'Communication error',
    };
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Explicitly close the Ledger connection and release the USB device.
 * Call this when navigating away from a Ledger page or when done with
 * all Ledger operations.
 */
export async function disconnectLedger(): Promise<void> {
  console.log('[ledger] disconnectLedger — cleaning up');
  await resetConnection();
}
