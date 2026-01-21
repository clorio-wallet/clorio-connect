import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetTrigger,
} from '@/components/ui/bottom-sheet';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { AppMessage, DeriveKeysResponse } from '@/messages/types';
import { useTranslation } from 'react-i18next';

interface WalletKeysSheetProps {
  mnemonic: string[];
}

export const WalletKeysSheet: React.FC<WalletKeysSheetProps> = ({
  mnemonic,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [keyPair, setKeyPair] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isDeriving, setIsDeriving] = useState(false);

  const deriveKeys = async () => {
    if (keyPair) return;

    setIsDeriving(true);
    try {
      const message: AppMessage = {
        type: 'DERIVE_KEYS_FROM_MNEMONIC',
        payload: { mnemonic: mnemonic.join(' ') },
      };

      const response = (await chrome.runtime.sendMessage(message)) as
        | DeriveKeysResponse
        | { error: string };

      if ('error' in response) {
        throw new Error(response.error);
      }

      setKeyPair({
        privateKey: response.privateKey,
        publicKey: response.publicKey,
      });
    } catch (err) {
      console.error('Failed to derive keys:', err);
      toast({
        variant: 'destructive',
        title: t('onboarding.wallet_keys_sheet.failed_toast_title'),
        description: t('onboarding.wallet_keys_sheet.failed_toast_desc'),
      });
    } finally {
      setIsDeriving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('onboarding.wallet_keys_sheet.copied_title') || 'Copied',
      description: t('onboarding.wallet_keys_sheet.copied_desc', { label }) || `${label} copied to clipboard`,
    });
  };

  return (
    <BottomSheet
      onOpenChange={(open) => {
        if (open) deriveKeys();
      }}
    >
      <BottomSheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground "
        >
          {t('onboarding.wallet_keys_sheet.show_key_button')}
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('onboarding.wallet_keys_sheet.title')}</BottomSheetTitle>
          <BottomSheetDescription>
            {t('onboarding.wallet_keys_sheet.desc')}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="p-4 space-y-4 pb-8">
          {isDeriving ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
              <p className="text-sm">{t('onboarding.wallet_keys_sheet.deriving')}</p>
            </div>
          ) : keyPair ? (
            <>
              <div className="space-y-2">
                <Label>{t('onboarding.wallet_keys_sheet.public_key_label')}</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={keyPair.publicKey}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(keyPair.publicKey, t('onboarding.wallet_keys_sheet.public_key_label'))
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('onboarding.wallet_keys_sheet.private_key_label')}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      readOnly
                      type={showPrivateKey ? 'text' : 'password'}
                      value={keyPair.privateKey}
                      className="font-mono text-xs pr-10"
                    />
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(keyPair.privateKey, t('onboarding.wallet_keys_sheet.private_key_label'))
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('onboarding.wallet_keys_sheet.failed_derive')}
            </div>
          )}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
};
