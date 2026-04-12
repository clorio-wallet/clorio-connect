import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, PenSquare, ShieldCheck, Wallet } from 'lucide-react';

import type { DappPendingApproval, DappRpcMethod } from '@/lib/dapp';
import type {
  DappGetPendingApprovalResponse,
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
import { PasswordInput } from '@/components/wallet/password-input';
import { useSessionStore } from '@/stores/session-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { VaultManager } from '@/lib/vault-manager';
import { formatAddress } from '@/lib/utils';
import { sessionStorage } from '@/lib/storage';

function getRequestTitle(method: DappRpcMethod): string {
  switch (method) {
    case 'mina_requestAccounts':
      return 'Approve connection';
    case 'mina_sendPayment':
      return 'Approve payment';
    case 'mina_sendStakeDelegation':
      return 'Approve delegation';
    case 'mina_signMessage':
      return 'Approve message signature';
    case 'mina_sendTransaction':
      return 'Approve zkApp signature';
    default:
      return 'Approve dApp request';
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
      return 'Review the message before allowing the site to use your wallet.';
    case 'mina_sendTransaction':
      return 'Review the zkApp transaction summary before signing it in the background service.';
    default:
      return 'Review the request details before continuing.';
  }
}

const DappApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    setHasVault,
    setIsAuthenticated,
    setTempPassword,
    restoreSession,
  } = useSessionStore();
  const { loadWallets, publicKey } = useWalletStore();
  const networkId = useSettingsStore((state) => state.networkId);

  const [pendingRequest, setPendingRequest] =
    useState<DappPendingApproval | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setTempPassword(password);

      const { autoLockTimeout } = useSettingsStore.getState();
      if (autoLockTimeout !== 0) {
        await sessionStorage.set('clorio_session', {
          password,
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
    setTempPassword,
  ]);

  const handleDecision = useCallback(
    async (approve: boolean) => {
      if (!pendingRequest) {
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
          },
        })) as DappResolvePendingApprovalResponse;

        if (!response?.ok) {
          throw new Error(response?.error || 'Failed to resolve the request.');
        }

        await loadPendingRequest();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to resolve request.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadPendingRequest, pendingRequest],
  );

  const summaryLines = useMemo(() => {
    if (!pendingRequest?.summary) {
      return [] as string[];
    }

    const lines: string[] = [];
    if (pendingRequest.summary.onlySign !== undefined) {
      lines.push(
        `onlySign: ${pendingRequest.summary.onlySign ? 'true' : 'false'}`,
      );
    }
    if (pendingRequest.summary.fee !== undefined) {
      lines.push(`fee: ${pendingRequest.summary.fee}`);
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

    return lines;
  }, [pendingRequest]);

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
            <CardTitle>No pending dApp request</CardTitle>
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
              Clorio keeps dApp approvals and signatures in the background
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
            {pendingRequest.site.iconUrl ? (
              <img
                src={pendingRequest.site.iconUrl}
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
            disabled={isSubmitting}
          >
            Reject
          </Button>
          <Button
            className="flex-1"
            onClick={() => void handleDecision(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Approve'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DappApprovalPage;
