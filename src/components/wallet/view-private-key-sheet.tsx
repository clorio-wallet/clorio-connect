import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { PasswordInput } from '@/components/wallet/password-input';
import { storage } from '@/lib/storage';
import { CryptoService } from '@/lib/crypto';
import { deriveMinaPrivateKey } from '@/lib/mina-utils';

interface VaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type?: 'mnemonic' | 'privateKey';
}

interface ViewPrivateKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewPrivateKeySheet: React.FC<ViewPrivateKeySheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<'warning' | 'password' | 'display'>('warning');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('warning');
      setPassword('');
      setError('');
      setRevealedKey(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleVerifyPassword = async () => {
    if (!password) {
      setError(t('security.view_private_key.password_required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const vault = await storage.get<VaultData>('clorio_vault');
      if (!vault) {
        throw new Error('No wallet found');
      }

      const secret = await CryptoService.decrypt(
        vault.encryptedSeed,
        password,
        vault.salt,
        vault.iv,
      );

      let privateKey = '';
      if (vault.type === 'privateKey') {
        privateKey = secret.trim();
      } else {
        privateKey = await deriveMinaPrivateKey(secret);
      }

      setRevealedKey(privateKey);
      setStep('display');
    } catch (error) {
      console.error('Failed to verify password:', error);
      setError(t('security.view_private_key.incorrect_password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>
            {step === 'warning' && t('security.view_private_key.title_warning')}
            {step === 'password' && t('security.view_private_key.title_password')}
            {step === 'display' && t('security.view_private_key.title_display')}
          </BottomSheetTitle>
          <BottomSheetDescription>
            {step === 'warning' &&
              t('security.view_private_key.desc_warning')}
            {step === 'password' &&
              t('security.view_private_key.desc_password')}
            {step === 'display' &&
              t('security.view_private_key.desc_display')}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <div className="p-4 space-y-4">
          {step === 'warning' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                {t('security.view_private_key.warning_box')}
              </div>
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('security.view_private_key.password_label')}</Label>
              <PasswordInput
                id="confirm-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('security.view_private_key.enter_password')}
                error={error}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyPassword();
                }}
              />
            </div>
          )}

          {step === 'display' && (
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('security.view_private_key.decrypting')}</p>
              ) : revealedKey ? (
                <div className="space-y-2">
                  <Label>{t('security.view_private_key.title_display')}</Label>
                  <div className="p-3 rounded-md bg-muted font-mono text-xs break-all select-all relative group">
                    {revealedKey}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        navigator.clipboard.writeText(revealedKey);
                        toast({
                          title: t('common.copied'),
                          description: t('security.view_private_key.key_copied'),
                        });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('security.view_private_key.key_unavailable')}
                </p>
              )}
            </div>
          )}
        </div>

        <BottomSheetFooter className="px-4 pb-8">
          {step === 'warning' && (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep('password')}
              >
                {t('security.view_private_key.i_am_alone')}
              </Button>
            </div>
          )}

          {step === 'password' && (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('warning')}
              >
                {t('common.back')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerifyPassword}
                disabled={isLoading}
              >
                {isLoading ? t('security.view_private_key.verifying') : t('security.view_private_key.view_btn')}
              </Button>
            </div>
          )}

          {step === 'display' && (
            <Button
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t('common.close')}
            </Button>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
