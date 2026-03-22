import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SignedLedgerDelegationResult } from '@/hooks/use-delegate-transaction';

interface LedgerResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: SignedLedgerDelegationResult | null;
}

export const LedgerResultDialog: React.FC<LedgerResultDialogProps> = ({
  open,
  onOpenChange,
  result,
}) => {
  const { t } = useTranslation();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ledger signed delegation</DialogTitle>
          <DialogDescription>
            Signature acquired from Ledger device.
          </DialogDescription>
        </DialogHeader>

        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
          {result
            ? JSON.stringify(
                {
                  signature: result.signature,
                  payload: result.payload,
                },
                null,
                2,
              )
            : ''}
        </pre>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
