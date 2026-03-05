import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

const NETWORK_FEE = 0.012;

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

  const [step, setStep] = React.useState<'review' | 'confirm'>('review');
  const [password, setPassword] = React.useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  const { data: accountData } = useGetAccount(publicKey || '', {
    query: { enabled: !!publicKey },
  });

  const nonce = accountData?.nonce ?? 0;
  const isHoldDisabled = loading || !password;

  React.useEffect(() => {
    if (!open) {
      setStep('review');
      setPassword('');
      setIsAdvancedOpen(false);
    }
  }, [open]);

  if (!validator) return null;

  const handleNextStep = () => setStep('confirm');

  const handleBack = () => {
    if (step === 'confirm') {
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
          {step === 'review' ? (
            <>
              {/* Avatar + Validator Info */}
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

              {/* Details Card */}
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

                  {/* Advanced Section */}
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
            </>
          ) : (
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
          <Button variant="outline" onClick={handleBack} disabled={loading}>
            {step === 'confirm' ? t('common.back') : t('common.cancel')}
          </Button>

          {step === 'review' ? (
            <Button onClick={handleNextStep}>{t('common.continue')}</Button>
          ) : (
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

// Keep a default export as an empty page redirect fallback so existing
// lazy-loaded route references don't break before cleanup.
export default function ConfirmDelegationPage() {
  return null;
}
