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
  const { publicKey } = useWalletStore();
  const { balancePollInterval } = useSettingsStore();
  const { toast } = useToast();
  const { sendTransaction, loading: sending } = useSendTransaction();

  const [pendingData, setPendingData] =
    React.useState<SendTransactionFormData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [signedResult, setSignedResult] =
    React.useState<SignedLedgerPaymentResult | null>(null);

  useEffect(() => {
    if (!publicKey) {
      navigate('/welcome');
    }
  }, [publicKey, navigate]);

  const pollIntervalMs =
    balancePollInterval > 0 ? balancePollInterval * 60 * 1000 : 0;

  const { data: accountData, isLoading: isAccountLoading } = useGetAccount(
    publicKey || '',
    {
      query: {
        enabled: !!publicKey,
        refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
      },
    },
  );

  const { network } = useDashboardData();

  const displayLoading = useMinimumLoading(isAccountLoading, 500);

  const balanceRaw = accountData?.balance || 0;
  const balanceMina = Number(balanceRaw) / 1e9;

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
                const result = await sendTransaction(pendingData, password || '');
                setIsDialogOpen(false);
                setPendingData(null);

                if (result.kind === 'signed') {
                  setSignedResult(result);
                  return;
                }

                navigate('/transactions');
              } catch (err) {
                if (!(err instanceof LedgerError)) {
                  const message =
                    err instanceof Error ? err.message : t('send.error_failed');
                  toast({
                    variant: 'destructive',
                    title: t('common.error'),
                    description: message,
                  });
                }
                throw err;
              }
            }}
          />
        )}

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
                Firma reale acquisita dal dispositivo. Nessun broadcast e stato eseguito.
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
