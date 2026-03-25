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

interface TransactionResult {
  id: string | null;
  hash: string | null;
}

interface TransactionData {
  recipient: string;
  amount: string;
  fee: string;
  memo?: string;
}

interface TransactionResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'broadcasting' | 'success' | 'failed';
  transaction: TransactionData | null;
  result: TransactionResult;
  error: string | null;
  network: string;
  onRetry: () => void;
}

export const TransactionResultSheet: React.FC<TransactionResultSheetProps> = ({
  open,
  onOpenChange,
  status,
  transaction,
  result,
  error,
  network,
  onRetry,
}) => {
  const { t } = useTranslation();

  const getDescription = () => {
    switch (status) {
      case 'broadcasting':
        return 'Broadcasting…';
      case 'success':
        return 'Broadcast success';
      case 'failed':
        return 'Broadcast failed';
      default:
        return '';
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-h-[85vh] min-h-[50vh] overflow-hidden flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle className="text-center">
            {t('send.send_button')}
          </BottomSheetTitle>
          <BottomSheetDescription className="text-center">
            {getDescription()}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetBody className="flex-1">
          {transaction && (
            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  To
                </div>
                <div className="break-all text-sm font-medium">
                  {transaction.recipient}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Amount
                  </div>
                  <div className="text-sm font-semibold">
                    {transaction.amount} MINA
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Fee
                  </div>
                  <div className="text-sm">{transaction.fee} MINA</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Network
                  </div>
                  <div className="text-sm">{network}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Memo
                  </div>
                  <div className="text-sm truncate">
                    {transaction.memo ? transaction.memo : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-6 space-y-4 text-sm">
              {result.id && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Id
                  </div>
                  <div className="break-all font-mono text-xs bg-muted/50 rounded-lg p-3">
                    {result.id}
                  </div>
                </div>
              )}
              {result.hash && (
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Hash
                  </div>
                  <div className="break-all font-mono text-xs bg-muted/50 rounded-lg p-3">
                    {result.hash}
                  </div>
                </div>
              )}
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
              ? t('common.continue', 'Continue')
              : t('common.close', 'Close')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
