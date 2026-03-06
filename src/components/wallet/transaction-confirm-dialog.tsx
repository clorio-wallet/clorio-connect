import * as React from "react";
import { AlertTriangle } from "lucide-react";
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
} from "@/components/ui";
import { AddressDisplay } from "./address-display";
import { NetworkBadge } from "./network-badge";
import { HoldToConfirmButton } from "./hold-to-confirm-button";
import { useTranslation } from "react-i18next";
import { LoopingLottie } from "@/components/ui/looping-lottie";
import lockAnimation from "@/animations/lock.json";

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
  onConfirm: (password?: string) => void;
  transaction: TransactionData;
  origin?: string;
  loading?: boolean;
  requirePassword?: boolean;
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

  const total = (
    parseFloat(transaction.amount) + parseFloat(transaction.fee)
  ).toFixed(8);

  const [password, setPassword] = React.useState('');
  const [step, setStep] = React.useState<'review' | 'confirm'>('review');

  React.useEffect(() => {
    if (!open) {
      setPassword('');
      setStep('review');
    }
  }, [open]);

  const handleNextStep = () => {
    setStep('confirm');
  };

  const isHoldDisabled = loading || !password;

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
          {step === 'review' ? (
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
            </>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="flex justify-center">
                <div className="h-32 w-32">
                  <LoopingLottie
                    animationData={lockAnimation}
                    loop={false}
                  />
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
            onClick={() => {
              if (step === 'confirm') {
                setStep('review');
              } else {
                onOpenChange(false);
              }
            }}
            disabled={loading}
          >
            {step === 'confirm' ? t('common.back') : t('common.cancel')}
          </Button>
          
          {step === 'review' ? (
            <Button onClick={handleNextStep}>
              {t('common.continue')}
            </Button>
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
