import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SendForm } from '@/components/wallet';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGetAccount } from '@/api/mina/mina';
import { useMinimumLoading } from '@/hooks/use-minimum-loading';
import { useToast } from '@/hooks/use-toast';
import {
  useSendTransaction,
  type SignedLedgerPaymentResult,
} from '@/hooks/use-send-transaction';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { LedgerError } from '@/lib/ledger';
import { TransactionConfirmDialog } from '@/components/wallet/transaction-confirm-dialog';
import type { SendTransactionFormData } from '@/lib/validations';

const SendPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicKey, accountType } = useWalletStore();
  const { balancePollInterval } = useSettingsStore();
  const { toast } = useToast();
  const { sendTransaction, loading: sending } = useSendTransaction();

  const [pendingData, setPendingData] =
    React.useState<SendTransactionFormData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [signedResult, setSignedResult] =
    React.useState<SignedLedgerPaymentResult | null>(null);
  const [broadcastOpen, setBroadcastOpen] = React.useState(false);
  const [broadcastStatus, setBroadcastStatus] = React.useState<
    'broadcasting' | 'success' | 'failed'
  >('broadcasting');
  const [broadcastId, setBroadcastId] = React.useState<string | null>(null);
  const [broadcastHash, setBroadcastHash] = React.useState<string | null>(null);
  const [broadcastError, setBroadcastError] = React.useState<string | null>(null);
  const lastPasswordRef = React.useRef<string>('');

  useEffect(() => {
    if (!publicKey) {
      navigate('/welcome');
    }
  }, [publicKey, navigate]);

  const pollIntervalMs =
    balancePollInterval > 0 ? balancePollInterval * 60 * 1000 : 0;

  const {
    data: accountData,
    isLoading: isAccountLoading,
    refetch: refetchAccount,
  } = useGetAccount(
    publicKey || '',
    {
      query: {
        enabled: !!publicKey,
        refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
        refetchOnMount: 'always',
      },
    },
  );

  useEffect(() => {
    if (!publicKey) return;
    refetchAccount();
  }, [publicKey, refetchAccount]);

  const { network } = useDashboardData();

  const displayLoading = useMinimumLoading(isAccountLoading, 500);

  const balanceRaw = accountData?.balance || 0;
  const balanceMina = Number(balanceRaw) / 1e9;

  const handleRetryBroadcast = async () => {
    if (!pendingData) return;
    if (!lastPasswordRef.current) {
      setBroadcastOpen(false);
      setIsDialogOpen(true);
      return;
    }

    setBroadcastStatus('broadcasting');
    setBroadcastId(null);
    setBroadcastHash(null);
    setBroadcastError(null);

    await refetchAccount();

    try {
      const result = await sendTransaction(pendingData, lastPasswordRef.current);
      if (result.kind === 'signed') return;
      setBroadcastStatus('success');
      setBroadcastId(result.id);
      setBroadcastHash(result.hash ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('send.error_failed');
      setBroadcastStatus('failed');
      setBroadcastError(message);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: message,
      });
    }
  };

  const handleSubmit = async (formData: SendTransactionFormData) => {
    setPendingData(formData);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 py-2">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{t('send.send_button')}</h1>
      </header>

      <div className="pb-4">
        <SendForm
          balance={displayLoading ? '0' : balanceMina.toString()}
          symbol="MINA"
          price={1}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          className={sending ? 'opacity-50 pointer-events-none' : ''}
        />

        {pendingData && (
          <TransactionConfirmDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setPendingData(null);
            }}
            transaction={{
              to: pendingData.recipient,
              amount: pendingData.amount,
              fee: pendingData.fee,
              symbol: 'MINA',
              network: network.label,
              memo: pendingData.memo,
            }}
            loading={sending}
            onConfirm={async (password) => {
              if (!pendingData) return;
              try {
                if (accountType !== 'ledger') {
                  lastPasswordRef.current = password || '';
                  setIsDialogOpen(false);
                  setBroadcastOpen(true);
                  setBroadcastStatus('broadcasting');
                  setBroadcastId(null);
                  setBroadcastHash(null);
                  setBroadcastError(null);
                }

                const result = await sendTransaction(pendingData, password || '');

                if (result.kind === 'signed') {
                  setIsDialogOpen(false);
                  setPendingData(null);
                  setSignedResult(result);
                  return;
                }

                setBroadcastStatus('success');
                setBroadcastId(result.id);
                setBroadcastHash(result.hash ?? null);
              } catch (err) {
                if (!(err instanceof LedgerError)) {
                  const message =
                    err instanceof Error ? err.message : t('send.error_failed');
                  setBroadcastStatus('failed');
                  setBroadcastError(message);
                  toast({
                    variant: 'destructive',
                    title: t('common.error'),
                    description: message,
                  });
                }
                if (accountType === 'ledger') {
                  throw err;
                }
              }
            }}
          />
        )}

        <Dialog
          open={broadcastOpen}
          onOpenChange={(open) => {
            setBroadcastOpen(open);
            if (!open) {
              const shouldNavigate =
                broadcastStatus === 'success' && (broadcastId || broadcastHash);
              setBroadcastId(null);
              setBroadcastHash(null);
              setBroadcastError(null);
              setPendingData(null);
              if (shouldNavigate) {
                navigate('/transactions');
              }
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('send.send_button')}</DialogTitle>
              <DialogDescription>
                {broadcastStatus === 'broadcasting'
                  ? 'Broadcasting…'
                  : broadcastStatus === 'success'
                    ? 'Broadcast success'
                    : 'Broadcast failed'}
              </DialogDescription>
            </DialogHeader>

            {pendingData && (
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">To</div>
                  <div className="break-all">{pendingData.recipient}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Amount</div>
                    <div>{pendingData.amount} MINA</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Fee</div>
                    <div>{pendingData.fee} MINA</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Network</div>
                    <div>{network.label}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Memo</div>
                    <div className="truncate">
                      {pendingData.memo ? pendingData.memo : '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {broadcastStatus === 'success' && (
              <div className="space-y-2 text-sm">
                {broadcastId && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Id</div>
                    <div className="break-all font-mono">{broadcastId}</div>
                  </div>
                )}
                {broadcastHash && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Hash</div>
                    <div className="break-all font-mono">{broadcastHash}</div>
                  </div>
                )}
              </div>
            )}

            {broadcastStatus === 'failed' && broadcastError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                {broadcastError}
              </div>
            )}

            <DialogFooter>
              {broadcastStatus === 'failed' && (
                <Button variant="outline" onClick={handleRetryBroadcast}>
                  {t('common.retry', 'Retry')}
                </Button>
              )}
              <Button
                onClick={() => setBroadcastOpen(false)}
                disabled={broadcastStatus === 'broadcasting'}
              >
                {broadcastStatus === 'success'
                  ? t('common.continue', 'Continue')
                  : t('common.close', 'Close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!signedResult}
          onOpenChange={(open) => {
            if (!open) setSignedResult(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ledger signed payment</DialogTitle>
              <DialogDescription>
                The transaction was signed on your Ledger device.
              </DialogDescription>
            </DialogHeader>

            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
              {signedResult
                ? JSON.stringify(
                    {
                      signature: signedResult.signature,
                      payload: signedResult.payload,
                    },
                    null,
                    2,
                  )
                : ''}
            </pre>

            <DialogFooter>
              <Button onClick={() => setSignedResult(null)}>
                {t('common.close', 'Close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SendPage;
