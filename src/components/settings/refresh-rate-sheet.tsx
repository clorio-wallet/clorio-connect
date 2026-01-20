import React from 'react';
import { Check } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetClose,
} from '@/components/ui/bottom-sheet';

export const REFRESH_RATE_OPTIONS = [
  { label: '1 minute', value: 1 },
  { label: '2 minutes', value: 2 },
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '30 minutes', value: 30 },
  { label: 'Manual only', value: -1 },
];

interface RefreshRateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshRateSheet: React.FC<RefreshRateSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { balancePollInterval, setBalancePollInterval } = useSettingsStore();

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>Balance Refresh Rate</BottomSheetTitle>
          <BottomSheetDescription>
            Choose how often your balance should update automatically.
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
            <Button variant="outline">Close</Button>
          </BottomSheetClose>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
