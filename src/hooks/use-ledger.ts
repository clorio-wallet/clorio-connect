import { useState, useCallback, useRef } from 'react';
import {
  requestLedgerPermission,
  checkLedgerStatus,
  getLedgerAddress,
  signLedgerPayment,
  signLedgerDelegation,
  LedgerStatus,
  type LedgerConnectionResult,
  type LedgerAddressResult,
  type LedgerSignResult,
  type PaymentParams,
  type DelegationParams,
} from '@/lib/ledger';
import type { MinaLedgerJS } from 'mina-ledger-js';

export type { LedgerStatus } from '@/lib/ledger';

const TAG = '[use-ledger]';

interface UseLedgerState {
  status: LedgerStatus | null;
  app: MinaLedgerJS | null;
  isChecking: boolean;
  isSigning: boolean;
  isImporting: boolean;
}

const DISCONNECTED: LedgerConnectionResult = {
  status: LedgerStatus.DISCONNECTED,
  app: null,
};

/**
 * React hook for Ledger hardware wallet interactions.
 *
 * Architecture (follows Auro Wallet's pattern):
 *
 *   TransportWebUSB.create() → MinaLedgerJS → getAddress / signTransaction
 *
 * The hook manages connection state and exposes simple async functions for
 * connecting, checking status, importing addresses, and signing transactions.
 *
 * IMPORTANT: This hook must be used in a component that runs in a full browser
 * tab (not the extension popup or side panel) because WebUSB requires a
 * user-visible top-level tab context for navigator.usb.requestDevice().
 *
 * The Ledger import page is opened in a tab via chrome.tabs.create() from the
 * method selection sheet. Since it loads the same popup.html with a hash route,
 * the full React app runs with WebUSB access.
 *
 * No APDU proxying, no usb-request tab, no background relay — all USB
 * communication happens directly in this tab via @ledgerhq/hw-transport-webusb.
 */
export function useLedger() {
  const [state, setState] = useState<UseLedgerState>({
    status: null,
    app: null,
    isChecking: false,
    isSigning: false,
    isImporting: false,
  });

  // Use a ref to always have the latest app instance available in callbacks
  // without needing to re-create them when state.app changes.
  // This avoids stale closure bugs where importAddress captures a null app
  // from an old render.
  const appRef = useRef<MinaLedgerJS | null>(null);

  /**
   * Start/stop the service worker keepalive.
   * Prevents the MV3 service worker from being terminated while the user is
   * confirming an operation on the physical Ledger device (~30 s timeout).
   */
  const keepalive = useCallback(
    (action: 'LEDGER_KEEPALIVE_START' | 'LEDGER_KEEPALIVE_END') => {
      console.log(`${TAG} keepalive → ${action}`);
      try {
        chrome.runtime.sendMessage({ type: action });
      } catch {
        // Background may not be available (e.g. running in a standalone tab
        // after extension reload) — not critical.
      }
    },
    [],
  );

  /**
   * Connect to the Ledger device.
   *
   * 1. Calls TransportWebUSB.create() to get USB access (may show the
   *    browser's device picker on first call).
   * 2. Pings the device to check if the Mina app is open.
   *
   * Returns the connection result with status and app instance.
   */
  const connect = useCallback(async (): Promise<LedgerConnectionResult> => {
    console.log(`${TAG} connect() — START`);
    setState((s) => ({ ...s, isChecking: true }));

    // Step 1: Ensure USB permission / transport.
    const granted = await requestLedgerPermission();
    console.log(`${TAG} connect() — permission granted:`, granted);

    if (!granted) {
      console.warn(`${TAG} connect() — permission not granted`);
      setState((s) => ({ ...s, ...DISCONNECTED, isChecking: false }));
      appRef.current = null;
      return DISCONNECTED;
    }

    // Step 2: Check if the Mina app is open.
    try {
      const result = await checkLedgerStatus();
      console.log(
        `${TAG} connect() — status:`,
        result.status,
        '| app:',
        result.app ? 'present' : 'null',
      );

      appRef.current = result.app;
      setState((s) => ({
        ...s,
        status: result.status,
        app: result.app,
        isChecking: false,
      }));
      return result;
    } catch (err) {
      console.error(`${TAG} connect() — threw:`, err);
      appRef.current = null;
      setState((s) => ({ ...s, ...DISCONNECTED, isChecking: false }));
      return DISCONNECTED;
    }
  }, []);

  /**
   * Re-check Ledger status without going through the USB picker again.
   * Uses the existing transport (if any) to ping the device.
   */
  const checkStatus =
    useCallback(async (): Promise<LedgerConnectionResult> => {
      console.log(`${TAG} checkStatus() — START`);
      setState((s) => ({ ...s, isChecking: true }));
      try {
        const result = await checkLedgerStatus();
        console.log(`${TAG} checkStatus() — result:`, result.status);
        appRef.current = result.app;
        setState((s) => ({
          ...s,
          status: result.status,
          app: result.app,
          isChecking: false,
        }));
        return result;
      } catch (err) {
        console.error(`${TAG} checkStatus() — threw:`, err);
        appRef.current = null;
        setState((s) => ({ ...s, ...DISCONNECTED, isChecking: false }));
        return DISCONNECTED;
      }
    }, []);

  /**
   * Read a public address from the Ledger for the given HD account index.
   * The device will display the address and wait for user confirmation.
   *
   * If no app instance is available, attempts to reconnect automatically.
   */
  const importAddress = useCallback(
    async (accountIndex: number): Promise<LedgerAddressResult> => {
      console.log(`${TAG} importAddress(${accountIndex}) — START`);

      let app = appRef.current;

      // Auto-reconnect if the app instance was lost.
      if (!app) {
        console.warn(
          `${TAG} importAddress — app is null, re-checking status...`,
        );
        try {
          const res = await checkLedgerStatus();
          console.log(
            `${TAG} importAddress — re-check:`,
            res.status,
            '| app:',
            res.app ? 'present' : 'null',
          );

          if (res.status !== LedgerStatus.READY || !res.app) {
            const errMsg =
              res.status === LedgerStatus.APP_NOT_OPEN
                ? 'Open the Mina app on your Ledger and try again.'
                : 'Ledger not found. Make sure the device is connected via USB.';
            return { publicKey: null, rejected: false, error: errMsg };
          }

          app = res.app;
          appRef.current = res.app;
          setState((s) => ({ ...s, status: res.status, app: res.app }));
        } catch (err) {
          console.error(`${TAG} importAddress — re-check threw:`, err);
          return {
            publicKey: null,
            rejected: false,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to check Ledger status',
          };
        }
      }

      setState((s) => ({ ...s, isImporting: true }));
      keepalive('LEDGER_KEEPALIVE_START');

      try {
        const result = await getLedgerAddress(app, accountIndex);
        console.log(`${TAG} importAddress — result:`, {
          publicKey: result.publicKey
            ? result.publicKey.slice(0, 12) + '…'
            : 'null',
          rejected: result.rejected,
          error: result.error,
        });
        return result;
      } catch (err) {
        console.error(`${TAG} importAddress — threw:`, err);
        return {
          publicKey: null,
          rejected: false,
          error:
            err instanceof Error ? err.message : 'Communication error',
        };
      } finally {
        setState((s) => ({ ...s, isImporting: false }));
        keepalive('LEDGER_KEEPALIVE_END');
      }
    },
    [keepalive],
  );

  /**
   * Sign a payment transaction on the Ledger device.
   * Auto-reconnects if the app instance was lost.
   */
  const signPayment = useCallback(
    async (
      params: PaymentParams,
      accountIndex: number,
    ): Promise<LedgerSignResult> => {
      console.log(`${TAG} signPayment — START, accountIndex:`, accountIndex);

      let app = appRef.current;

      if (!app) {
        console.warn(`${TAG} signPayment — app is null, re-checking...`);
        try {
          const res = await checkLedgerStatus();
          if (res.status !== LedgerStatus.READY || !res.app) {
            const errMsg =
              res.status === LedgerStatus.APP_NOT_OPEN
                ? 'Open the Mina app on your Ledger and try again.'
                : 'Ledger not found. Make sure the device is connected via USB.';
            return {
              signature: null,
              payload: null,
              rejected: false,
              error: errMsg,
            };
          }
          app = res.app;
          appRef.current = res.app;
          setState((s) => ({ ...s, status: res.status, app: res.app }));
        } catch (err) {
          console.error(`${TAG} signPayment — re-check threw:`, err);
          return {
            signature: null,
            payload: null,
            rejected: false,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to check Ledger status',
          };
        }
      }

      setState((s) => ({ ...s, isSigning: true }));
      keepalive('LEDGER_KEEPALIVE_START');

      try {
        const result = await signLedgerPayment(app, params, accountIndex);
        console.log(
          `${TAG} signPayment — rejected=${result.rejected}, error=${result.error}, hasSig=${!!result.signature}`,
        );
        return result;
      } catch (err) {
        console.error(`${TAG} signPayment — threw:`, err);
        return {
          signature: null,
          payload: null,
          rejected: false,
          error:
            err instanceof Error ? err.message : 'Communication error',
        };
      } finally {
        setState((s) => ({ ...s, isSigning: false }));
        keepalive('LEDGER_KEEPALIVE_END');
      }
    },
    [keepalive],
  );

  /**
   * Sign a delegation transaction on the Ledger device.
   * Auto-reconnects if the app instance was lost.
   */
  const signDelegation = useCallback(
    async (
      params: DelegationParams,
      accountIndex: number,
    ): Promise<LedgerSignResult> => {
      console.log(
        `${TAG} signDelegation — START, accountIndex:`,
        accountIndex,
      );

      let app = appRef.current;

      if (!app) {
        console.warn(`${TAG} signDelegation — app is null, re-checking...`);
        try {
          const res = await checkLedgerStatus();
          if (res.status !== LedgerStatus.READY || !res.app) {
            const errMsg =
              res.status === LedgerStatus.APP_NOT_OPEN
                ? 'Open the Mina app on your Ledger and try again.'
                : 'Ledger not found. Make sure the device is connected via USB.';
            return {
              signature: null,
              payload: null,
              rejected: false,
              error: errMsg,
            };
          }
          app = res.app;
          appRef.current = res.app;
          setState((s) => ({ ...s, status: res.status, app: res.app }));
        } catch (err) {
          console.error(`${TAG} signDelegation — re-check threw:`, err);
          return {
            signature: null,
            payload: null,
            rejected: false,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to check Ledger status',
          };
        }
      }

      setState((s) => ({ ...s, isSigning: true }));
      keepalive('LEDGER_KEEPALIVE_START');

      try {
        const result = await signLedgerDelegation(app, params, accountIndex);
        console.log(
          `${TAG} signDelegation — rejected=${result.rejected}, error=${result.error}, hasSig=${!!result.signature}`,
        );
        return result;
      } catch (err) {
        console.error(`${TAG} signDelegation — threw:`, err);
        return {
          signature: null,
          payload: null,
          rejected: false,
          error:
            err instanceof Error ? err.message : 'Communication error',
        };
      } finally {
        setState((s) => ({ ...s, isSigning: false }));
        keepalive('LEDGER_KEEPALIVE_END');
      }
    },
    [keepalive],
  );

  return {
    status: state.status,
    app: state.app,
    isChecking: state.isChecking,
    isSigning: state.isSigning,
    isImporting: state.isImporting,
    isReady: state.status === LedgerStatus.READY,
    connect,
    checkStatus,
    importAddress,
    signPayment,
    signDelegation,
  };
}
