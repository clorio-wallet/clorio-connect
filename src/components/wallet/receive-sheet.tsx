import React from 'react';
import { CustomQRCode } from '@/components/ui/custom-qr-code';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from '@/components/wallet/address-display';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

interface ReceiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
}

export const ReceiveSheet: React.FC<ReceiveSheetProps> = ({
  open,
  onOpenChange,
  address,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    toast({
      title: t('common.copied'),
      description: t('receive.address_copied'),
    });
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('receive.title')}</BottomSheetTitle>
          <BottomSheetDescription>
            {t('receive.desc')}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          <div className="flex justify-center w-full">
            <CustomQRCode
              value={address}
              size={240}
            />
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs text-center text-muted-foreground uppercase font-medium">
              {t('receive.your_address')}
            </p>
            <div className="flex justify-center">
                <AddressDisplay address={address} truncate={false} showCopy={true} className="bg-muted p-3 rounded-lg text-sm break-all text-center" />
            </div>
          </div>
        </div>

        <BottomSheetFooter>
          <Button onClick={handleCopy} className="w-full">
            <Copy className="mr-2 h-4 w-4" />
            {t('receive.copy_address')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
