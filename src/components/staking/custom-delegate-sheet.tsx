import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VaultValidator } from '@/lib/vault-validator';

interface CustomDelegateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (address: string) => void;
}

export const CustomDelegateSheet: React.FC<CustomDelegateSheetProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [customAddress, setCustomAddress] = React.useState('');

  const trimmedCustomAddress = customAddress.trim();
  const isValid =
    trimmedCustomAddress.length > 0 &&
    VaultValidator.isValidMinaPublicKey(trimmedCustomAddress);

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(trimmedCustomAddress);
      setCustomAddress('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setCustomAddress('');
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>
            {t('staking.custom_delegate_title', 'Delegate to custom address')}
          </BottomSheetTitle>
          <BottomSheetDescription>
            {t(
              'staking.custom_delegate_desc',
              'Enter a validator public key to delegate without selecting from the list.',
            )}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetBody>
          <div className="space-y-2 py-2">
            <Label htmlFor="custom-validator-address">
              {t('staking.custom_delegate_field', 'Validator public key')}
            </Label>
            <Input
              id="custom-validator-address"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="B62..."
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'staking.custom_delegate_hint',
                'Use a valid Mina validator address starting with B62.',
              )}
            </p>
          </div>
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            {t('common.continue', 'Continue')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
