import * as React from 'react';
import { AlertTriangle, HardDrive, AppWindow, RefreshCw } from 'lucide-react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { LedgerStatus } from '@/lib/ledger';
import { useTranslation } from 'react-i18next';

interface LedgerStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: LedgerStatus | null;
  isChecking?: boolean;
  onRetry: () => void;
}

interface StatusConfig {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  retryLabelKey: string;
}

function useStatusConfig(status: LedgerStatus | null): StatusConfig {
  const iconClass = 'h-10 w-10';

  if (status === LedgerStatus.APP_NOT_OPEN) {
    return {
      icon: <AppWindow className={iconClass} />,
      titleKey: 'ledger.errors.app_not_open_title',
      descKey: 'ledger.errors.app_not_open_desc',
      retryLabelKey: 'ledger.errors.retry',
    };
  }

  return {
    icon: <HardDrive className={iconClass} />,
    titleKey: 'ledger.errors.disconnected_title',
    descKey: 'ledger.errors.disconnected_desc',
    retryLabelKey: 'ledger.errors.retry',
  };
}

export function LedgerStatusModal({
  open,
  onOpenChange,
  status,
  isChecking = false,
  onRetry,
}: LedgerStatusModalProps) {
  const { t } = useTranslation();
  const config = useStatusConfig(status);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="max-h-[60vh]">
        <BottomSheetHeader className="items-center text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-muted p-4 text-muted-foreground">
              {config.icon}
            </div>
          </div>
          <BottomSheetTitle className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            {t(config.titleKey)}
          </BottomSheetTitle>
          <BottomSheetDescription className="text-center text-sm leading-relaxed">
            {t(config.descKey)}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetFooter className="flex-col gap-2 pt-4">
          <Button
            className="w-full"
            onClick={onRetry}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('ledger.connect_step.checking')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t(config.retryLabelKey)}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={isChecking}
          >
            {t('common.cancel')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
