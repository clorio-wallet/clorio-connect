import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface DelegationResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'broadcasting' | 'success' | 'failed';
  validatorName: string | null;
  validatorAddress: string | null;
  hash: string | null;
  error: string | null;
  onRetry: () => void;
}

export const DelegationResultSheet: React.FC<DelegationResultSheetProps> = ({
  open,
  onOpenChange,
  status,
  validatorName,
  validatorAddress,
  hash,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();

  const getTitle = () => {
    switch (status) {
      case 'broadcasting':
        return t('staking.broadcasting', 'Broadcasting delegation...');
      case 'success':
        return t('staking.success_title', 'Delegation successful');
      case 'failed':
        return t('staking.failed_title', 'Delegation failed');
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (status) {
      case 'broadcasting':
        return t(
          'staking.broadcasting_desc',
          'Please wait while your delegation is being broadcast to the network...',
        );
      case 'success':
        return t(
          'staking.success_desc',
          'Your delegation has been successfully broadcast.',
        );
      case 'failed':
        return t('staking.failed_desc', 'Something went wrong.');
      default:
        return '';
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-h-[85vh] min-h-[50vh] overflow-hidden flex flex-col">
        <BottomSheetHeader>
          <div className="flex flex-col items-center gap-3">
            {status === 'broadcasting' && (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            )}
            {status === 'failed' && (
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
            <div className="text-center">
              <BottomSheetTitle className="text-center">
                {getTitle()}
              </BottomSheetTitle>
              <BottomSheetDescription className="text-center mt-1">
                {getDescription()}
              </BottomSheetDescription>
            </div>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="flex-1">
          {validatorName && (
            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {t('staking.validator', 'Validator')}
                </div>
                <div className="text-sm font-medium">{validatorName}</div>
              </div>

              {validatorAddress && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {t('staking.validator_address', 'Address')}
                  </div>
                  <div className="break-all font-mono text-xs bg-muted/50 rounded-lg p-3">
                    {validatorAddress}
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'success' && hash && (
            <div className="mt-6 space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {t('staking.transaction_hash', 'Transaction Hash')}
              </div>
              <div className="break-all font-mono text-xs bg-muted/50 rounded-lg p-3">
                {hash}
              </div>
            </div>
          )}

          {status === 'failed' && error && (
            <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-destructive">⚠</span>
                <span>{error}</span>
              </div>
            </div>
          )}
        </BottomSheetBody>

        <BottomSheetFooter className="flex-row justify-end gap-3 pt-4 mt-0 shrink-0">
          {status === 'failed' && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="min-h-[44px] flex-1"
            >
              {t('common.retry', 'Retry')}
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            disabled={status === 'broadcasting'}
            className="min-h-[44px] flex-1"
          >
            {status === 'success'
              ? t('common.done', 'Done')
              : t('common.close', 'Close')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
