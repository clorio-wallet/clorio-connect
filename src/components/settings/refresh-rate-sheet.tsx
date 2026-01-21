import React from 'react';
import { Check } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetClose,
} from '@/components/ui/bottom-sheet';

interface RefreshRateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshRateSheet: React.FC<RefreshRateSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { balancePollInterval, setBalancePollInterval } = useSettingsStore();

  const REFRESH_RATE_OPTIONS = [
    { label: t('settings.refresh_sheet.options.1_min'), value: 1 },
    { label: t('settings.refresh_sheet.options.2_min'), value: 2 },
    { label: t('settings.refresh_sheet.options.5_min'), value: 5 },
    { label: t('settings.refresh_sheet.options.10_min'), value: 10 },
    { label: t('settings.refresh_sheet.options.30_min'), value: 30 },
    { label: t('settings.refresh_sheet.options.manual'), value: -1 },
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('settings.refresh_sheet.title')}</BottomSheetTitle>
          <BottomSheetDescription>
            {t('settings.refresh_sheet.desc')}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="grid gap-2">
              {REFRESH_RATE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    balancePollInterval === option.value
                      ? 'bg-accent border-primary/50'
                      : 'hover:bg-accent/50 border-transparent',
                  )}
                  onClick={() => {
                    setBalancePollInterval(option.value);
                    onOpenChange(false);
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  {balancePollInterval === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomSheetFooter>
          <BottomSheetClose asChild>
            <Button variant="outline">{t('common.close')}</Button>
          </BottomSheetClose>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
