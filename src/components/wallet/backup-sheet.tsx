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
import { SeedPhraseDisplay } from '@/components/wallet/seed-phrase-display';
import { useWalletStore } from '@/stores/wallet-store';

interface BackupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BackupSheet: React.FC<BackupSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { activeWalletId, wallets, loadWallets } = useWalletStore();
  const [step, setStep] = useState<'warning' | 'password' | 'display'>(
    'warning',
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backupData, setBackupData] = useState<string | null>(null);
  const [backupType, setBackupType] = useState<
    'mnemonic' | 'privateKey' | null
  >(null);

  const activeWallet = activeWalletId
    ? wallets.find((wallet) => wallet.id === activeWalletId)
    : null;

  useEffect(() => {
    if (open) {

      if (wallets.length === 0) {
        loadWallets().catch((err) => {
          console.error('[BackupSheet] Failed to load wallets:', err);
        });
      }
    }
  }, [open, activeWalletId, wallets, activeWallet, loadWallets]);

  useEffect(() => {
    if (open) {
      setStep('warning');
      setPassword('');
      setError('');
      setBackupData(null);
      setBackupType(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleVerifyPassword = async () => {
    if (!password) {
      setError(t('security.backup.password_required'));
      return;
    }

    if (!activeWalletId || !activeWallet) {
      setError(t('security.backup.wallet_not_found'));
      return;
    }

    // Ledger wallets should not reach here, but double-check
    if (activeWallet.type === 'ledger') {
      setError(t('security.backup.not_available_for_ledger'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isMnemonic = activeWallet.type === 'mnemonic';

      const response = await chrome.runtime.sendMessage({
        type: isMnemonic ? 'GET_MNEMONIC' : 'GET_PRIVATE_KEY',
        payload: {
          password,
          walletId: activeWalletId,
        },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('Failed to retrieve backup data');
      }

      setBackupData(response.data);
      setBackupType(isMnemonic ? 'mnemonic' : 'privateKey');
      setStep('display');
    } catch (error) {
      console.error('Failed to retrieve backup:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Ledger') || message.includes('not expose')) {
        setError(t('security.backup.not_available_for_ledger'));
      } else if (message.includes('password') || message.includes('decrypt')) {
        setError(t('security.backup.incorrect_password'));
      } else {
        setError(t('security.backup.retrieval_failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (backupData) {
      navigator.clipboard.writeText(backupData);
      toast({
        title: t('common.copied'),
        description:
          backupType === 'mnemonic'
            ? t('security.backup.mnemonic_copied')
            : t('security.backup.key_copied'),
      });
    }
  };

  const getTitle = () => {
    if (step === 'warning') return t('security.backup.title_warning');
    if (step === 'password') return t('security.backup.title_password');
    return backupType === 'mnemonic'
      ? t('security.backup.title_mnemonic')
      : t('security.backup.title_private_key');
  };

  const getDescription = () => {
    if (step === 'warning') return t('security.backup.desc_warning');
    if (step === 'password') return t('security.backup.desc_password');
    return backupType === 'mnemonic'
      ? t('security.backup.desc_mnemonic')
      : t('security.backup.desc_private_key');
  };

  if (!activeWallet || activeWallet.type === 'ledger') {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>
              {t('security.backup.title_warning')}
            </BottomSheetTitle>
            <BottomSheetDescription>
              {!activeWallet
                ? t('security.backup.wallet_not_found')
                : t('security.backup.not_available_for_ledger')}
            </BottomSheetDescription>
          </BottomSheetHeader>
          <BottomSheetFooter className="px-4 pb-8">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{getTitle()}</BottomSheetTitle>
          <BottomSheetDescription className="text-left">
            {getDescription()}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <div className="p-4 space-y-4">
          {step === 'warning' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                {t('security.backup.warning_box')}
              </div>
              <div className="text-sm text-muted-foreground">
                {activeWallet?.type === 'mnemonic'
                  ? t('security.backup.mnemonic_info')
                  : t('security.backup.private_key_info')}
              </div>
            </div>
          )}

          {step === 'password' && (
            <div className="space-y-2">
              <Label htmlFor="backup-password">
                {t('security.backup.password_label')}
              </Label>
              <PasswordInput
                id="backup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('security.backup.enter_password')}
                error={error}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyPassword();
                }}
              />
            </div>
          )}

          {step === 'display' && (
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">
                  {t('security.backup.decrypting')}
                </p>
              ) : backupData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">
                      {backupType === 'mnemonic'
                        ? t('security.backup.your_mnemonic')
                        : t('security.backup.your_private_key')}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {backupType === 'mnemonic'
                        ? t('security.backup.mnemonic_words', {
                            count: backupData.split(' ').length,
                          })
                        : ''}
                    </span>
                  </div>

                  {backupType === 'mnemonic' ? (
                    <div className="border-2 border-yellow-500/30 rounded-md p-4">
                      <SeedPhraseDisplay
                        mnemonic={backupData.split(' ')}
                        showCopy={false}
                      />
                    </div>
                  ) : (
                    <div className="p-4 rounded-md bg-muted font-mono text-sm break-all select-all relative group border-2 border-yellow-500/30">
                      {backupData}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                        onClick={handleCopy}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {t('security.backup.security_notice')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('security.backup.unavailable')}
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
              <Button className="flex-1" onClick={() => setStep('password')}>
                {t('security.backup.continue')}
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
                {isLoading
                  ? t('security.backup.verifying')
                  : t('security.backup.view_backup')}
              </Button>
            </div>
          )}

          {step === 'display' && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                {t('common.copy')}
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                {t('security.backup.done')}
              </Button>
            </div>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
