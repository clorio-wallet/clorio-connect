import * as React from 'react';
import {
  AlertTriangle,
  HardDrive,
  Loader2,
  XCircle,
  WifiOff,
  AppWindow,
} from 'lucide-react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  Button,
  Separator,
  Input,
} from '@/components/ui';
import { AddressDisplay } from './address-display';
import { NetworkBadge } from './network-badge';
import { HoldToConfirmButton } from './hold-to-confirm-button';
import { useTranslation } from 'react-i18next';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import lockAnimation from '@/animations/lock.json';
import { useWalletStore } from '@/stores/wallet-store';
import { LedgerError, LedgerErrorKind } from '@/lib/ledger';

interface TransactionData {
  to: string;
  amount: string;
  symbol: string;
  fee: string;
  network: string;
  memo?: string;
}

interface TransactionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password?: string) => Promise<void>;
  transaction: TransactionData;
  origin?: string;
  loading?: boolean;
}

interface LedgerErrorBannerProps {
  error: LedgerError;
  onRetry: () => void;
}

function LedgerErrorBanner({ error, onRetry }: LedgerErrorBannerProps) {
  const { t } = useTranslation();

  const config: Record<
    LedgerErrorKind,
    { icon: React.ReactNode; title: string; desc: string; canRetry: boolean }
  > = {
    [LedgerErrorKind.REJECTED]: {
      icon: <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />,
      title: t('ledger.errors.rejected_title', 'Cancelled on device'),
      desc: t(
        'ledger.errors.rejected_desc',
        'You rejected the operation on your Ledger. You can try again.',
      ),
      canRetry: true,
    },
    [LedgerErrorKind.DISCONNECTED]: {
      icon: <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />,
      title: t('ledger.errors.disconnected_title', 'Ledger not found'),
      desc: t(
        'ledger.errors.disconnected_desc',
        'Make sure your Ledger is connected via USB, unlocked with your PIN, and try again.',
      ),
      canRetry: true,
    },
    [LedgerErrorKind.APP_NOT_OPEN]: {
      icon: <AppWindow className="h-5 w-5 text-destructive shrink-0 mt-0.5" />,
      title: t('ledger.errors.app_not_open_title', 'Mina app not open'),
      desc: t(
        'ledger.errors.app_not_open_desc',
        'Navigate to the Mina app on your Ledger device and press both buttons to open it.',
      ),
      canRetry: true,
    },
    [LedgerErrorKind.SIGN_FAILED]: {
      icon: <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />,
      title: t('ledger.errors.sign_failed_title', 'Signing failed'),
      desc: error.message,
      canRetry: true,
    },
  };

  const { icon, title, desc, canRetry } = config[error.kind];

  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        {icon}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
      {canRetry && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={onRetry}
        >
          <HardDrive className="mr-2 h-3.5 w-3.5" />
          {t('ledger.errors.retry', 'Try again')}
        </Button>
      )}
    </div>
  );
}

export function TransactionConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  transaction,
  origin,
  loading = false,
}: TransactionConfirmDialogProps) {
  const { t } = useTranslation();
  const isLedger = useWalletStore((s) => s.accountType === 'ledger');

  const total = (
    parseFloat(transaction.amount) + parseFloat(transaction.fee)
  ).toFixed(8);

  const [password, setPassword] = React.useState('');
  const [step, setStep] = React.useState<'review' | 'confirm'>('review');
  const [ledgerLoading, setLedgerLoading] = React.useState(false);
  const [ledgerError, setLedgerError] = React.useState<LedgerError | null>(
    null,
  );

  React.useEffect(() => {
    if (!open) {
      setPassword('');
      setStep('review');
      setLedgerError(null);
      setLedgerLoading(false);
    }
  }, [open]);

  const handleLedgerSign = React.useCallback(async () => {
    setLedgerError(null);
    setLedgerLoading(true);
    try {
      await onConfirm('');
    } catch (err) {
      if (err instanceof LedgerError) {
        setLedgerError(err);
      } else {
        setLedgerError(
          LedgerError.signFailed(
            err instanceof Error ? err.message : String(err),
          ),
        );
      }
    } finally {
      setLedgerLoading(false);
    }
  }, [onConfirm]);

  const isEffectivelyLoading = isLedger ? ledgerLoading : loading;
  const isHoldDisabled = isEffectivelyLoading || !password;

  const handleBackOrCancel = () => {
    if (!isLedger && step === 'confirm') {
      setStep('review');
    } else {
      onOpenChange(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-h-[80vh] min-h-[50vh] overflow-hidden flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('transaction_confirm.title')}
          </BottomSheetTitle>
          {origin && (
            <BottomSheetDescription className="flex items-center gap-2">
              <span>{t('transaction_confirm.request_from')}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                {origin}
              </code>
            </BottomSheetDescription>
          )}
        </BottomSheetHeader>

        <div className="space-y-4 px-4 overflow-y-auto flex-1">
          {step === 'review' && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  {t('transaction_confirm.recipient_label')}
                </label>
                <div className="rounded-lg bg-muted p-3">
                  <AddressDisplay
                    address={transaction.to}
                    truncate={false}
                    showCopy={true}
                    className="text-sm break-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  {t('transaction_confirm.amount_label')}
                </label>
                <div className="text-2xl font-semibold">
                  {transaction.amount}{' '}
                  <span className="text-muted-foreground">
                    {transaction.symbol}
                  </span>
                </div>
              </div>

              {transaction.memo && (
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">
                    {t('transaction_confirm.memo_label')}
                  </label>
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    {transaction.memo}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('transaction_confirm.network_fee_label')}
                  </span>
                  <span>
                    {transaction.fee} {transaction.symbol}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{t('transaction_confirm.total_label')}</span>
                  <span>
                    {total} {transaction.symbol}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('transaction_confirm.network_label')}
                </span>
                <NetworkBadge network={transaction.network} />
              </div>

              {isLedger && ledgerError && (
                <LedgerErrorBanner
                  error={ledgerError}
                  onRetry={handleLedgerSign}
                />
              )}
            </>
          )}

          {!isLedger && step === 'confirm' && (
            <div className="space-y-4 pt-4">
              <div className="flex justify-center">
                <div className="h-32 w-32">
                  <LoopingLottie animationData={lockAnimation} loop={false} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t('security.password_label')}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  placeholder={t('security.enter_password')}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <BottomSheetFooter className="flex-row justify-end gap-2 pt-4 mt-0 shrink-0">
          <Button
            variant="outline"
            onClick={handleBackOrCancel}
            disabled={isEffectivelyLoading}
          >
            {!isLedger && step === 'confirm'
              ? t('common.back')
              : t('common.cancel')}
          </Button>

          {isLedger && step === 'review' && !ledgerError && (
            <Button
              onClick={handleLedgerSign}
              disabled={ledgerLoading}
              className="min-w-[160px]"
            >
              {ledgerLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('transaction_confirm.processing')}
                </>
              ) : (
                <>
                  <HardDrive className="mr-2 h-4 w-4" />
                  {t('ledger.sign_on_device', 'Sign on Ledger')}
                </>
              )}
            </Button>
          )}

          {!isLedger && step === 'review' && (
            <Button onClick={() => setStep('confirm')}>
              {t('common.continue')}
            </Button>
          )}

          {!isLedger && step === 'confirm' && (
            <HoldToConfirmButton
              onConfirm={() => onConfirm(password)}
              holdDuration={1500}
              disabled={isHoldDisabled}
              className="min-w-[160px]"
            >
              {loading
                ? t('transaction_confirm.processing')
                : t('transaction_confirm.hold_to_confirm')}
            </HoldToConfirmButton>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
