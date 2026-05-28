import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, PenSquare, ShieldCheck, Wallet } from 'lucide-react';

import type { DappPendingApproval, DappRpcMethod } from '@/lib/dapp';
import type {
  DappGetPendingApprovalResponse,
  GetPrivateKeyResponse,
  DappResolvePendingApprovalResponse,
} from '@/messages/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLedger } from '@/hooks/use-ledger';
import { LedgerStatus } from '@/lib/ledger';
import { PasswordInput } from '@/components/wallet/password-input';
import { useSessionStore } from '@/stores/session-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { VaultManager } from '@/lib/vault-manager';
import { formatAddress } from '@/lib/utils';
import { sessionStorage, storage } from '@/lib/storage';
import { getAccountNonce } from '@/api/mina/transactions';
import { STORED_CREDENTIALS_KEY } from '@/lib/dapp';
import { captureApiFailure } from '@/lib/analytics';

const DEFAULT_PAYMENT_FEE = '0.1';

function requiresApprovalPassword(method: DappRpcMethod): boolean {
  return (
    method !== 'mina_requestAccounts' &&
    method !== 'mina_switchChain' &&
    method !== 'mina_addChain' &&
    method !== 'mina_storePrivateCredential'
  );
}

function isLedgerSigningMethod(method: DappRpcMethod): boolean {
  return method === 'mina_sendPayment' || method === 'mina_sendStakeDelegation';
}

function toLedgerNetworkId(networkLabel: string): 0x00 | 0x01 {
  return networkLabel === 'mainnet' ? 0x01 : 0x00;
}

function decodeLedgerSignature(signatureHex: string): {
  field: string;
  scalar: string;
} {
  if (signatureHex.length !== 128) {
    throw new Error('Invalid signature format from Ledger');
  }

  return {
    field: signatureHex.slice(0, 64),
    scalar: signatureHex.slice(64, 128),
  };
}

function getSafeSiteIconUrl(
  iconUrl: string | undefined,
  siteOrigin: string,
): string | null {
  if (!iconUrl) {
    return null;
  }

  try {
    const parsed = new URL(iconUrl, siteOrigin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function getRequestTitle(method: DappRpcMethod): string {
  switch (method) {
    case 'mina_requestAccounts':
      return 'Approve connection';
    case 'mina_sendPayment':
      return 'Approve transaction';
    case 'mina_sendStakeDelegation':
      return 'Approve delegation';
    case 'mina_signMessage':
      return 'Approve message signature';
    case 'mina_sendTransaction':
      return 'Approve zkApp signature';
    case 'mina_signFields':
      return 'Approve field signature';
    case 'mina_createNullifier':
      return 'Approve nullifier creation';
    case 'mina_signJsonMessage':
      return 'Approve JSON message signature';
    case 'mina_switchChain':
      return 'Approve network switch';
    case 'mina_addChain':
      return 'Approve add network';
    case 'mina_storePrivateCredential':
      return 'Approve credential storage';
    case 'mina_requestPresentation':
      return 'Approve anonymous login';
    default:
      return 'Approve zkApp request';
  }
}

function getRequestDescription(method: DappRpcMethod): string {
  switch (method) {
    case 'mina_requestAccounts':
      return 'This site wants to connect to your current Clorio account.';
    case 'mina_sendPayment':
      return 'Review the payment before Clorio signs and broadcasts it in the background service.';
    case 'mina_sendStakeDelegation':
      return 'Review the delegation before Clorio signs and broadcasts it in the background service.';
    case 'mina_signMessage':
      return 'Review the message before allowing the site to use your wallet. Ledger is not supported for this method yet.';
    case 'mina_sendTransaction':
      return 'Review the zkApp transaction summary before signing it in the background service. Ledger is not supported for this method yet.';
    case 'mina_signFields':
      return 'This site wants to sign an array of fields with your private key. Ledger is not supported for this method yet.';
    case 'mina_createNullifier':
      return 'This site wants to create a nullifier from your private key and the provided fields. Ledger is not supported for this method yet.';
    case 'mina_signJsonMessage':
      return 'This site wants to sign a JSON message with your private key. Ledger is not supported for this method yet.';
    case 'mina_switchChain':
      return 'This site wants to switch your active network. Confirm the target network before approving.';
    case 'mina_addChain':
      return 'This site wants to add a custom network and switch your active network.';
    case 'mina_storePrivateCredential':
      return 'This site wants to store a credential in your wallet for the active account.';
    case 'mina_requestPresentation':
      return 'This site wants to generate a presentation from a stored credential. Ledger is not supported for this method yet.';
    default:
      return 'Review the request details before continuing.';
  }
}

const DappApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setHasVault, setIsAuthenticated, restoreSession } =
    useSessionStore();
  const { loadWallets, publicKey } = useWalletStore();
  const ledgerAccountIndex = useWalletStore(
    (state) => state.ledgerAccountIndex,
  );
  const networkId = useSettingsStore((state) => state.networkId);
  const apiUrl = useNetworkStore((state) => state.networks[networkId]?.apiUrl);
  const {
    connect,
    signPayment,
    signDelegation,
    isChecking: isLedgerChecking,
    isSigning: isLedgerSigning,
  } = useLedger();

  const [pendingRequest, setPendingRequest] =
    useState<DappPendingApproval | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTabContext, setIsTabContext] = useState(false);

  const loadPendingRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'DAPP_GET_PENDING_APPROVAL',
      })) as DappGetPendingApprovalResponse;

      setPendingRequest(response?.request ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void loadPendingRequest();
  }, [loadPendingRequest]);

  useEffect(() => {
    chrome.tabs.getCurrent((tab) => {
      setIsTabContext(Boolean(tab?.id));
    });
  }, []);

  const isLedgerRequest =
    pendingRequest?.account.type === 'ledger' &&
    isLedgerSigningMethod(pendingRequest.method);

  const requiresPassword =
    !!pendingRequest &&
    requiresApprovalPassword(pendingRequest.method) &&
    !isLedgerRequest;

  const handleUnlock = useCallback(async () => {
    if (!password) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const vault = await VaultManager.loadVault();
      if (!vault) {
        throw new Error('No compatible software wallet was found.');
      }

      await VaultManager.getPrivateKey(password, vault.activeWalletId);
      await loadWallets();

      setHasVault(true);
      setIsAuthenticated(true);

      const { autoLockTimeout } = useSettingsStore.getState();
      if (autoLockTimeout !== 0) {
        await sessionStorage.set('clorio_session', {
          timestamp: Date.now(),
        });
      }

      setPassword('');
      await loadPendingRequest();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to unlock wallet.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    loadPendingRequest,
    loadWallets,
    password,
    setHasVault,
    setIsAuthenticated,
  ]);

  const handleDecision = useCallback(
    async (approve: boolean) => {
      if (!pendingRequest) {
        return;
      }

      if (approve && isLedgerRequest) {
        if (!isTabContext) {
          const approvalUrl = chrome.runtime.getURL(
            'src/popup/index.html#/dapp/approval',
          );
          await chrome.tabs.create({ url: approvalUrl, active: true });
          setErrorMessage('Continue the Ledger approval in the opened tab.');
          return;
        }

        if (ledgerAccountIndex === null) {
          setErrorMessage('No Ledger account index was found for this wallet.');
          return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
          const connection = await connect();
          if (connection.status !== LedgerStatus.READY || !connection.app) {
            throw new Error(
              connection.status === LedgerStatus.APP_NOT_OPEN
                ? 'Open the Mina app on your Ledger and try again.'
                : 'Ledger not found. Make sure the device is connected via USB.',
            );
          }

          const nonceResult = await getAccountNonce(
            pendingRequest.account.publicKey,
          );
          const nonce =
            typeof pendingRequest.summary?.nonce === 'number'
              ? pendingRequest.summary.nonce
              : nonceResult.pendingNonce;

          let result: unknown;

          if (pendingRequest.method === 'mina_sendPayment') {
            if (
              !pendingRequest.summary?.to ||
              pendingRequest.summary.amount === undefined
            ) {
              throw new Error('Incomplete payment request summary.');
            }

            const signed = await signPayment(
              {
                fromAddress: pendingRequest.account.publicKey,
                toAddress: pendingRequest.summary.to,
                amount: String(pendingRequest.summary.amount),
                fee: String(pendingRequest.summary.fee ?? DEFAULT_PAYMENT_FEE),
                nonce,
                memo: pendingRequest.summary.memo ?? '',
                networkId: toLedgerNetworkId(networkId),
              },
              ledgerAccountIndex,
            );

            if (signed.rejected) {
              throw new Error('Operation rejected on device.');
            }
            if (!signed.signature) {
              throw new Error(signed.error ?? 'Ledger signing failed.');
            }

            const signature = decodeLedgerSignature(signed.signature);

            const response = await fetch(
              `${apiUrl || import.meta.env.VITE_API_URL}/v1/mina/transaction`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({
                  input: {
                    from: pendingRequest.account.publicKey,
                    to: pendingRequest.summary.to,
                    amount: String(signed.payload?.amount ?? ''),
                    fee: String(signed.payload?.fee ?? ''),
                    nonce: String(signed.payload?.nonce ?? nonce),
                    memo: signed.payload?.memo ?? '',
                    validUntil: String(
                      signed.payload?.validUntil ?? 4294967295,
                    ),
                  },
                  signature,
                  rawSignature: signed.signature,
                }),
              },
            );

            if (!response.ok) {
              captureApiFailure({
                endpoint_group: 'mina_transaction',
                method: 'POST',
                status_code: response.status,
                failure_class: 'http_error',
                runtime_area: 'approval_ui',
              });
              throw new Error('Broadcast failed');
            }

            const broadcast = (await response.json()) as {
              hash?: string;
              id?: string;
            };

            result = {
              hash: broadcast.hash ?? broadcast.id,
              id: broadcast.id ?? broadcast.hash,
            };
          } else {
            if (
              !pendingRequest.summary?.to ||
              pendingRequest.summary.fee === undefined
            ) {
              throw new Error('Incomplete delegation request summary.');
            }

            const signed = await signDelegation(
              {
                fromAddress: pendingRequest.account.publicKey,
                toAddress: pendingRequest.summary.to,
                fee: String(pendingRequest.summary.fee),
                nonce,
                memo: pendingRequest.summary.memo ?? '',
                networkId: toLedgerNetworkId(networkId),
              },
              ledgerAccountIndex,
            );

            if (signed.rejected) {
              throw new Error('Operation rejected on device.');
            }
            if (!signed.signature) {
              throw new Error(signed.error ?? 'Ledger signing failed.');
            }

            const signature = decodeLedgerSignature(signed.signature);

            const response = await fetch(
              `${apiUrl || import.meta.env.VITE_API_URL}/v1/mina/transaction/delegation`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({
                  input: {
                    from: pendingRequest.account.publicKey,
                    to: pendingRequest.summary.to,
                    fee: String(signed.payload?.fee ?? ''),
                    nonce: String(signed.payload?.nonce ?? nonce),
                    memo: signed.payload?.memo ?? '',
                    validUntil: String(
                      signed.payload?.validUntil ?? 4294967295,
                    ),
                  },
                  signature,
                  rawSignature: signed.signature,
                }),
              },
            );

            if (!response.ok) {
              captureApiFailure({
                endpoint_group: 'mina_transaction_delegation',
                method: 'POST',
                status_code: response.status,
                failure_class: 'http_error',
                runtime_area: 'approval_ui',
              });
              throw new Error('Broadcast failed');
            }

            const broadcast = (await response.json()) as {
              hash?: string;
              id?: string;
            };

            result = {
              hash: broadcast.hash ?? broadcast.id,
              id: broadcast.id ?? broadcast.hash,
            };
          }

          const response = (await chrome.runtime.sendMessage({
            type: 'DAPP_RESOLVE_PENDING_APPROVAL',
            payload: {
              requestId: pendingRequest.requestId,
              approve: true,
              result,
            },
          })) as DappResolvePendingApprovalResponse;

          if (!response?.ok) {
            throw new Error(
              response?.error || 'Failed to resolve the request.',
            );
          }

          await loadPendingRequest();
          setPassword('');
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to resolve request.',
          );
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      if (approve && pendingRequest.method === 'mina_requestPresentation') {
        if (!password.trim()) {
          setErrorMessage('Enter your password to approve this request.');
          return;
        }

        if (!pendingRequest.summary?.presentationRequest) {
          setErrorMessage('Missing presentation request payload.');
          return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
          const storedCredentials =
            (await storage.get<
              Array<{
                id: string;
                walletId: string;
                origin: string;
                storedAt: number;
                version: 1;
                credential: unknown;
              }>
            >(STORED_CREDENTIALS_KEY)) ?? [];

          const matchingCredentials = storedCredentials.filter(
            (credential) =>
              credential.walletId === pendingRequest.account.walletId &&
              credential.origin === pendingRequest.site.origin,
          );

          if (matchingCredentials.length === 0) {
            throw new Error(
              'No stored credential was found for this site and wallet.',
            );
          }

          const privateKeyResponse = (await chrome.runtime.sendMessage({
            type: 'GET_PRIVATE_KEY',
            payload: {
              password,
              walletId: pendingRequest.account.walletId,
            },
          })) as GetPrivateKeyResponse;

          if (!privateKeyResponse?.privateKey) {
            throw new Error(
              privateKeyResponse?.error || 'Failed to load private key.',
            );
          }

          const [
            { Credential, Presentation, PresentationRequest },
            { PrivateKey },
          ] = await Promise.all([import('mina-attestations'), import('o1js')]);

          const requestType =
            typeof (
              pendingRequest.summary.presentationRequest as { type?: unknown }
            )?.type === 'string'
              ? (
                  pendingRequest.summary.presentationRequest as {
                    type: 'https' | 'zk-app' | 'no-context';
                  }
                ).type
              : 'https';

          const request = PresentationRequest.fromJSON(
            requestType,
            JSON.stringify(pendingRequest.summary.presentationRequest),
          );

          const credentials = await Promise.all(
            matchingCredentials.map(async (entry) =>
              Credential.fromJSON(JSON.stringify(entry.credential)),
            ),
          );

          const presentation = await Presentation.create(
            PrivateKey.fromBase58(privateKeyResponse.privateKey),
            {
              request,
              credentials,
              context: { verifierIdentity: pendingRequest.site.origin },
            },
          );

          const response = (await chrome.runtime.sendMessage({
            type: 'DAPP_RESOLVE_PENDING_APPROVAL',
            payload: {
              requestId: pendingRequest.requestId,
              approve: true,
              result: {
                presentation: Presentation.toJSON(presentation),
              },
            },
          })) as DappResolvePendingApprovalResponse;

          if (!response?.ok) {
            throw new Error(
              response?.error || 'Failed to resolve the request.',
            );
          }

          await loadPendingRequest();
          setPassword('');
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to resolve request.',
          );
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      if (approve && requiresPassword && password.trim().length === 0) {
        setErrorMessage('Enter your password to approve this request.');
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const response = (await chrome.runtime.sendMessage({
          type: 'DAPP_RESOLVE_PENDING_APPROVAL',
          payload: {
            requestId: pendingRequest.requestId,
            approve,
            password: approve && requiresPassword ? password : undefined,
          },
        })) as DappResolvePendingApprovalResponse;

        if (!response?.ok) {
          if (response?.isRetryable) {
            setErrorMessage(
              response.error || 'Incorrect password. Please try again.',
            );
            setIsSubmitting(false);
            return;
          }
          throw new Error(response?.error || 'Failed to resolve the request.');
        }

        await loadPendingRequest();
        setPassword('');
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to resolve request.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      connect,
      isLedgerRequest,
      isTabContext,
      ledgerAccountIndex,
      loadPendingRequest,
      networkId,
      apiUrl,
      password,
      pendingRequest,
      requiresPassword,
      storage,
      signDelegation,
      signPayment,
    ],
  );

  const summaryLines = useMemo(() => {
    if (!pendingRequest?.summary) {
      return [] as string[];
    }

    const lines: string[] = [];
    const fallbackFee =
      pendingRequest.method === 'mina_sendPayment' &&
      (pendingRequest.summary.fee === undefined ||
        pendingRequest.summary.fee === null)
        ? DEFAULT_PAYMENT_FEE
        : pendingRequest.summary.fee;

    if (pendingRequest.summary.onlySign !== undefined) {
      lines.push(
        `onlySign: ${pendingRequest.summary.onlySign ? 'true' : 'false'}`,
      );
    }
    if (fallbackFee !== undefined && fallbackFee !== null) {
      lines.push(`fee: ${fallbackFee}`);
    }
    if (pendingRequest.summary.amount !== undefined) {
      lines.push(`amount: ${pendingRequest.summary.amount}`);
    }
    if (pendingRequest.summary.to) {
      lines.push(`to: ${pendingRequest.summary.to}`);
    }
    if (pendingRequest.summary.nonce !== undefined) {
      lines.push(`nonce: ${pendingRequest.summary.nonce}`);
    }
    if (pendingRequest.summary.memo) {
      lines.push(`memo: ${pendingRequest.summary.memo}`);
    }

    if (pendingRequest.summary.networkID) {
      lines.push(`networkID: ${pendingRequest.summary.networkID}`);
    }

    if (pendingRequest.summary.name) {
      lines.push(`name: ${pendingRequest.summary.name}`);
    }

    if (pendingRequest.summary.url) {
      lines.push(`url: ${pendingRequest.summary.url}`);
    }

    if (Array.isArray(pendingRequest.summary.fields)) {
      lines.push(`fields: ${pendingRequest.summary.fields.join(', ')}`);
    }

    if (Array.isArray(pendingRequest.summary.entries)) {
      pendingRequest.summary.entries.forEach((entry) => {
        if (entry.label && entry.value) {
          lines.push(`${entry.label}: ${entry.value}`);
        }
      });
    }

    return lines;
  }, [pendingRequest]);

  const safeSiteIconUrl = useMemo(
    () =>
      pendingRequest
        ? getSafeSiteIconUrl(
            pendingRequest.site.iconUrl,
            pendingRequest.site.origin,
          )
        : null,
    [pendingRequest],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pendingRequest) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle>No pending zkApp request</CardTitle>
            <CardDescription>
              Return to the extension dashboard or trigger a new request from
              the site.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                navigate(isAuthenticated ? '/dashboard' : '/welcome')
              }
            >
              Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle>Unlock to continue</CardTitle>
            <CardDescription>
              Clorio keeps zkApp approvals and signatures in the background
              service. Unlock your wallet to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PasswordInput
              id="dapp-approval-password"
              label="Wallet password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/welcome')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => void handleUnlock()}
              disabled={!password || isSubmitting}
            >
              {isSubmitting ? 'Unlocking...' : 'Unlock'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader>
          <div className="flex items-start gap-3">
            {safeSiteIconUrl ? (
              <img
                src={safeSiteIconUrl}
                alt=""
                className="mt-1 h-10 w-10 rounded-lg border bg-background object-contain p-1"
              />
            ) : (
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <CardTitle>{getRequestTitle(pendingRequest.method)}</CardTitle>
              <CardDescription>
                {getRequestDescription(pendingRequest.method)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Site</p>
                <p className="break-all text-muted-foreground">
                  {pendingRequest.site.origin}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Account</p>
                <p className="text-muted-foreground">
                  {pendingRequest.account.name} (
                  {formatAddress(pendingRequest.account.publicKey)})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <PenSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Network</p>
                <p className="text-muted-foreground">
                  {pendingRequest.networkId}{' '}
                  {networkId !== pendingRequest.networkId
                    ? `(extension currently set to ${networkId})`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          {pendingRequest.summary?.message && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Message</p>
              <pre className="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs whitespace-pre-wrap break-all">
                {pendingRequest.summary.message}
              </pre>
            </div>
          )}

          {summaryLines.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Request summary</p>
              <pre className="rounded-lg border bg-muted/50 p-3 text-xs whitespace-pre-wrap break-all">
                {summaryLines.join('\n')}
              </pre>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          {requiresPassword && (
            <PasswordInput
              id="dapp-approval-confirm-password"
              label="Confirm password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password to sign"
            />
          )}

          {isLedgerRequest && (
            <p className="text-sm text-muted-foreground">
              {isTabContext
                ? 'Confirm this request on your Ledger device.'
                : 'Open this approval in a browser tab to continue with Ledger.'}
            </p>
          )}

          {publicKey && publicKey !== pendingRequest.account.publicKey && (
            <p className="text-sm text-warning">
              The active wallet in the UI does not match the account that opened
              this request. Review carefully before approving.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => void handleDecision(false)}
            disabled={isSubmitting || isLedgerChecking || isLedgerSigning}
          >
            Reject
          </Button>
          <Button
            className="flex-1"
            onClick={() => void handleDecision(true)}
            disabled={isSubmitting || (requiresPassword && !password)}
          >
            {isSubmitting || isLedgerChecking || isLedgerSigning
              ? isLedgerChecking
                ? 'Connecting...'
                : isLedgerSigning
                  ? 'Awaiting Ledger...'
                  : 'Processing...'
              : isLedgerRequest && !isTabContext
                ? 'Open in tab'
                : 'Approve'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DappApprovalPage;
