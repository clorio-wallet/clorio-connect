import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useWalletStore } from '@/stores/wallet-store';
import { VaultManager } from '@/lib/vault-manager';
import { BIP44Service } from '@/lib/bip44';
import { DEFAULT_WALLET_NAME_PREFIX } from '@/lib/types/vault';

import { useTranslation } from 'react-i18next';

export const VerifyMnemonicPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tempMnemonic, tempPassword, setHasVault, setIsAuthenticated } =
    useSessionStore();
  const { setWallet } = useWalletStore();

  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);
  const [verificationValues, setVerificationValues] = useState<{
    [key: number]: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!tempMnemonic || tempMnemonic.length === 0) {
      toast({
        variant: 'destructive',
        title: t('onboarding.verify.error_session_expired'),
        description: t('onboarding.verify.error_session_expired_desc'),
      });
      navigate('/');
      return;
    }

    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 12));
    }
    setVerificationIndices(Array.from(indices).sort((a, b) => a - b));
  }, [tempMnemonic, navigate, toast, t]);

  const handleVerifyAndFinish = async () => {
    for (const index of verificationIndices) {
      const enteredWord = verificationValues[index]?.trim().toLowerCase();
      const actualWord = tempMnemonic![index];

      if (enteredWord !== actualWord) {
        toast({
          variant: 'destructive',
          title: t('onboarding.verify.error_verify_failed'),
          description: t('onboarding.verify.error_verify_failed_desc', {
            index: index + 1,
          }),
        });
        return;
      }
    }

    setIsCreating(true);
    try {
      const mnemonicString = tempMnemonic!.join(' ');

      const vault = await VaultManager.createVault(tempPassword!, {
        name: `${DEFAULT_WALLET_NAME_PREFIX}1`,
        secret: mnemonicString,
        type: 'mnemonic',
        derivationPath: BIP44Service.getDerivationPath(0),
        accountIndex: 0,
      });

      const firstWallet = vault.wallets[0];

      setHasVault(true);
      setIsAuthenticated(true);

      setWallet({
        publicKey: firstWallet.publicKey,
        accountId: null,
        walletId: firstWallet.id,
        accountType: 'software',
        accountName: firstWallet.name,
      });

      toast({
        title: t('onboarding.verify.success_title'),
        description: t('onboarding.verify.success_desc'),
      });

      setTimeout(() => navigate('/'), 100);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      toast({
        variant: 'destructive',
        title: t('onboarding.create.error_title') || 'Error',
        description: t('onboarding.verify.error_create_failed'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 py-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">
          {t('onboarding.verify.title_page')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.verify.desc_page')}
        </p>
      </div>
      <div className="flex-1 space-y-4">
        {verificationIndices.map((index) => (
          <div key={index} className="space-y-2">
            <Label htmlFor={`word-${index}`}>
              {t('onboarding.verify.label_word', { index: index + 1 })}
            </Label>
            <Input
              id={`word-${index}`}
              placeholder={t('onboarding.verify.placeholder_word', {
                index: index + 1,
              })}
              value={verificationValues[index] || ''}
              onChange={(e) =>
                setVerificationValues((prev) => ({
                  ...prev,
                  [index]: e.target.value,
                }))
              }
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>
        ))}
      </div>

      <div className="pt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(-1)}
          disabled={isCreating}
        >
          {t('onboarding.create.back_button')}
        </Button>
        <Button
          className="flex-1"
          disabled={Object.keys(verificationValues).length !== 3 || isCreating}
          onClick={handleVerifyAndFinish}
        >
          {isCreating
            ? t('onboarding.verify.creating')
            : t('onboarding.verify.verify_button')}
        </Button>
      </div>
    </div>
  );
};
