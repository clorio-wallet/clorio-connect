import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  XCircle,
  WifiOff,
  AppWindow,
} from 'lucide-react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetFooter,
  Button,
  Input,
} from '@/components/ui';
import { HoldToConfirmButton } from '@/components/wallet/hold-to-confirm-button';
import { ValidatorDetails } from '@/components/wallet/validator-details-sheet';
import { useGetAccount } from '@/api/mina/mina';
import { useWalletStore } from '@/stores/wallet-store';
import { formatBalance, formatAddress, truncateMiddle } from '@/lib/utils';
import { LoopingLottie } from '@/components/ui/looping-lottie';
import lockAnimation from '@/animations/lock.json';
import { HardDrive, Loader2 } from 'lucide-react';
import { LedgerError, LedgerErrorKind } from '@/lib/ledger';

const NETWORK_FEE = 0.012;

interface LedgerErrorBannerProps {
  error: LedgerError;
  onRetry: () => void;
}

function LedgerErrorBanner({ error, onRetry }: LedgerErrorBannerProps) {
  const { t } = useTranslation();

  const config: Record<
    LedgerErrorKind,
    { icon: React.ReactNode; title: string; desc: string }
  > = {
    [LedgerErrorKind.REJECTED]: {
      icon: <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />,
      title: t('ledger.errors.rejected_title', 'Cancelled on device'),
      desc: t(
        'ledger.errors.rejected_desc',
        'You rejected the operation on your Ledger. You can try again.',
      ),
    },
    [LedgerErrorKind.DISCONNECTED]: {
      icon: <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />,
      title: t('ledger.errors.disconnected_title', 'Ledger not found'),
      desc: t(
        'ledger.errors.disconnected_desc',
        'Make sure your Ledger is connected via USB, unlocked with your PIN, and try again.',
      ),
    },
    [LedgerErrorKind.APP_NOT_OPEN]: {
      icon: <AppWindow className="h-5 w-5 text-destructive shrink-0 mt-0.5" />,
      title: t('ledger.errors.app_not_open_title', 'Mina app not open'),
      desc: t(
        'ledger.errors.app_not_open_desc',
        'Navigate to the Mina app on your Ledger device and press both buttons to open it.',
      ),
    },
    [LedgerErrorKind.SIGN_FAILED]: {
      icon: <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />,
      title: t('ledger.errors.sign_failed_title', 'Signing failed'),
      desc: error.message,
    },
  };

  const { icon, title, desc } = config[error.kind];

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
      <Button size="sm" variant="outline" className="w-full" onClick={onRetry}>
        <HardDrive className="mr-2 h-3.5 w-3.5" />
        {t('ledger.errors.retry', 'Try again')}
      </Button>
    </div>
  );
}

interface ConfirmDelegationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validator: ValidatorDetails | null;
  onConfirm: (password: string) => Promise<void>;
  loading?: boolean;
}

export function ConfirmDelegationSheet({
  open,
  onOpenChange,
  validator,
  onConfirm,
  loading = false,
}: ConfirmDelegationSheetProps) {
  const { t } = useTranslation();
  const { publicKey } = useWalletStore();
  const isLedger = useWalletStore((s) => s.accountType === 'ledger');

  const [step, setStep] = React.useState<'review' | 'confirm'>('review');
  const [password, setPassword] = React.useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const [ledgerLoading, setLedgerLoading] = React.useState(false);
  const [ledgerError, setLedgerError] = React.useState<LedgerError | null>(
    null,
  );

  const { data: accountData } = useGetAccount(publicKey || '', {
    query: { enabled: !!publicKey },
  });

  const nonce = accountData?.nonce ?? 0;
  const isEffectivelyLoading = isLedger ? ledgerLoading : loading;
  const isHoldDisabled = isEffectivelyLoading || !password;

  React.useEffect(() => {
    if (!open) {
      setStep('review');
      setPassword('');
      setIsAdvancedOpen(false);
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

  if (!validator) return null;

  const handleBack = () => {
    if (!isLedger && step === 'confirm') {
      setStep('review');
    } else {
      onOpenChange(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-h-[85vh] min-h-[55vh] overflow-hidden flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle className="text-center">
            {t('staking.confirm_delegation', 'Confirm delegation')}
          </BottomSheetTitle>
        </BottomSheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          {step === 'review' && (
            <>
              <div className="flex flex-col items-center space-y-3 pt-2">
                <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                  {validator.imgurl ? (
                    <img
                      src={validator.imgurl}
                      alt={validator.name || validator.publicKey}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-800" />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold">
                    {validator.name || formatAddress(validator.publicKey)}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {truncateMiddle(validator.publicKey, 24)}
                  </p>
                </div>
              </div>

              <div className="w-full rounded-xl border border-border/40 bg-card/30 overflow-hidden">
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">
                      {t('validators.total_stake_label', 'Total stake')}
                    </span>
                    <span className="font-mono text-sm">
                      {formatBalance(validator.stake)} MINA
                    </span>
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">
                      {t('validators.fee_label', 'Validator fee')}
                    </span>
                    <span className="font-mono text-sm">{validator.fee}%</span>
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">
                      {t('send.network_fee_label', 'Network fee')}
                    </span>
                    <span className="font-mono text-sm">
                      {NETWORK_FEE} MINA
                    </span>
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="w-full space-y-2">
                    <div
                      className="flex items-center justify-between cursor-pointer w-full hover:opacity-80 transition-opacity"
                      onClick={() => setIsAdvancedOpen((v) => !v)}
                    >
                      <span className="font-bold text-sm">
                        {t('common.advanced', 'Advanced')}
                      </span>
                      {isAdvancedOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>

                    {isAdvancedOpen && (
                      <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-200 fade-in">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">
                            {t('transaction_details.nonce', 'Nonce')}
                          </span>
                          <span className="font-mono text-sm">{nonce}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
            onClick={handleBack}
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

export default function ConfirmDelegationPage() {
  return null;
}
