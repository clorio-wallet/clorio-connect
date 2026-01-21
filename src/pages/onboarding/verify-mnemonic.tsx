import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useWalletStore } from '@/stores/wallet-store';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import { AppMessage, DeriveKeysResponse } from '@/messages/types';
import { useGetIdFromPublicKeyLazyQuery } from '@/graphql/generated';
import { useTranslation } from 'react-i18next';

export const VerifyMnemonicPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    tempMnemonic,
    tempPassword,
    setHasVault,
    setIsAuthenticated,
  } = useSessionStore();
  const { setWallet } = useWalletStore();

  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);
  const [verificationValues, setVerificationValues] = useState<{
    [key: number]: string;
  }>({});
  const [isCreating, setIsCreating] = useState(false);

  const [getId] = useGetIdFromPublicKeyLazyQuery();

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

    // Select 3 random indices to verify
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 12));
    }
    setVerificationIndices(Array.from(indices).sort((a, b) => a - b));
  }, [tempMnemonic, navigate, toast, t]);

  const handleVerifyAndFinish = async () => {
    // Verify words
    for (const index of verificationIndices) {
      const enteredWord = verificationValues[index]?.trim().toLowerCase();
      const actualWord = tempMnemonic![index];

      if (enteredWord !== actualWord) {
        toast({
          variant: 'destructive',
          title: t('onboarding.verify.error_verify_failed'),
          description: t('onboarding.verify.error_verify_failed_desc', { index: index + 1 }),
        });
        return;
      }
    }

    setIsCreating(true);
    try {
      const mnemonicString = tempMnemonic!.join(' ');

      // Derive keys first
      const message: AppMessage = {
        type: 'DERIVE_KEYS_FROM_MNEMONIC',
        payload: { mnemonic: mnemonicString },
      };
      const response = (await chrome.runtime.sendMessage(message)) as
        | DeriveKeysResponse
        | { error: string };

      if ('error' in response) {
        throw new Error(response.error);
      }
      const { publicKey } = response;

      // Encrypt mnemonic
      const encryptedData = await CryptoService.encrypt(
        mnemonicString,
        tempPassword!,
      );

      // Save vault
      await storage.set('clorio_vault', {
        encryptedSeed: encryptedData.ciphertext,
        salt: encryptedData.salt,
        iv: encryptedData.iv,
        version: 1,
        type: 'mnemonic',
        createdAt: Date.now(),
      });

      setHasVault(true);
      setIsAuthenticated(true);

      // Get Account ID if exists
      try {
        const { data } = await getId({
          variables: { publicKey },
        });
        const accountId = data?.idByPublicKey?.id || null;
        setWallet({ publicKey, accountId });
      } catch (error) {
        console.error('Failed to fetch account ID:', error);
        setWallet({ publicKey, accountId: null });
      }

      toast({
        title: t('onboarding.verify.success_title'),
        description: t('onboarding.verify.success_desc'),
      });

      // Clear temp session data
      // We don't want to clear session completely, just temp data?
      // Actually session store might handle this or we just navigate
      // clearSession() would clear tempPassword too, but we are authenticated now?
      // The session store seems to keep tempPassword for the session?
      // Let's assume we just navigate.
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
        <h1 className="text-xl font-bold">{t('onboarding.verify.title_page')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.verify.desc_page')}
        </p>
      </div>
      <div className="flex-1 space-y-4">
        {verificationIndices.map((index) => (
          <div key={index} className="space-y-2">
            <Label htmlFor={`word-${index}`}>{t('onboarding.verify.label_word', { index: index + 1 })}</Label>
            <Input
              id={`word-${index}`}
              placeholder={t('onboarding.verify.placeholder_word', { index: index + 1 })}
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
          {isCreating ? t('onboarding.verify.creating') : t('onboarding.verify.verify_button')}
        </Button>
      </div>
    </div>
  );
};
