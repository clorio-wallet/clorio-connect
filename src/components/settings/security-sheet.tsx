import React from 'react';
import { Check } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';
import { sessionStorage } from '@/lib/storage';
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

interface SecuritySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SecuritySheet: React.FC<SecuritySheetProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { autoLockTimeout, setAutoLockTimeout } = useSettingsStore();
  const { tempPassword, isAuthenticated } = useSessionStore();

  const AUTO_LOCK_OPTIONS = [
    { label: t('settings.security_sheet.options.window_close'), value: 0 },
    { label: t('settings.security_sheet.options.5_min'), value: 5 },
    { label: t('settings.security_sheet.options.15_min'), value: 15 },
    { label: t('settings.security_sheet.options.30_min'), value: 30 },
    { label: t('settings.security_sheet.options.1_hour'), value: 60 },
    { label: t('settings.security_sheet.options.never'), value: -1 },
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('settings.security_sheet.title')}</BottomSheetTitle>
          <BottomSheetDescription>
            {t('settings.security_sheet.desc')}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t('settings.security_sheet.auto_lock_timer')}</h3>
            <div className="grid gap-2">
              {AUTO_LOCK_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    autoLockTimeout === option.value
                      ? "bg-accent border-primary/50"
                      : "hover:bg-accent/50 border-transparent"
                  )}
                  onClick={async () => {
                    setAutoLockTimeout(option.value);
                    onOpenChange(false);
                    
                    // Update persistence immediately
                    if (isAuthenticated && tempPassword) {
                      if (option.value !== 0) {
                        await sessionStorage.set('clorio_session', {
                          password: tempPassword,
                          timestamp: Date.now()
                        });
                      } else {
                        await sessionStorage.remove('clorio_session');
                      }
                    }
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  {autoLockTimeout === option.value && (
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
