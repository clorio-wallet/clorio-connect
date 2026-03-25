import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface TransactionResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: 'broadcasting' | 'success' | 'failed';
  transaction: TransactionData | null;
  result: TransactionResult;
  error: string | null;
  network: string;
  onRetry: () => void;
}

export const TransactionResultDialog: React.FC<
  TransactionResultDialogProps
> = ({
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('send.send_button')}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {transaction && (
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <div className="text-muted-foreground">To</div>
              <div className="break-all">{transaction.recipient}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-muted-foreground">Amount</div>
                <div>{transaction.amount} MINA</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Fee</div>
                <div>{transaction.fee} MINA</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-muted-foreground">Network</div>
                <div>{network}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Memo</div>
                <div className="truncate">
                  {transaction.memo ? transaction.memo : '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-2 text-sm">
            {result.id && (
              <div className="space-y-1">
                <div className="text-muted-foreground">Id</div>
                <div className="break-all font-mono">{result.id}</div>
              </div>
            )}
            {result.hash && (
              <div className="space-y-1">
                <div className="text-muted-foreground">Hash</div>
                <div className="break-all font-mono">{result.hash}</div>
              </div>
            )}
          </div>
        )}

        {status === 'failed' && error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          {status === 'failed' && (
            <Button variant="outline" onClick={onRetry}>
              {t('common.retry', 'Retry')}
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            disabled={status === 'broadcasting'}
          >
            {status === 'success'
              ? t('common.continue', 'Continue')
              : t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
