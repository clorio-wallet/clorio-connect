import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SeedPhraseDisplay } from '@/components/wallet/seed-phrase-display';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WalletKeysSheet } from '@/components/onboarding/wallet-keys-sheet';
import { useTranslation } from 'react-i18next';

export const CreateWalletPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tempPassword, setTempMnemonic } = useSessionStore();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    // Generate mnemonic only when user is ready
    // 128 bits = 12 words (Standard BIP39)
    // Uses Cryptographically-Secure Random Number Generator
    const mn = generateMnemonic(wordlist, 128);
    setMnemonic(mn.split(' '));
    setIsRevealed(true);
  };

  const handleNext = () => {
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: t('onboarding.create.error_title') || 'Error',
        description: t('onboarding.create.error_password'),
      });
      navigate('/');
      return;
    }

    setTempMnemonic(mnemonic);
    navigate('/onboarding/verify');
  };

  return (
    <div className="relative flex flex-col h-full space-y-6 py-4">
      {!isRevealed && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl">
          <div className="space-y-6 max-w-[280px] text-center animate-in fade-in duration-500">
            <div className="space-y-2">
              <h2 className="text-3xl font-serif text-foreground tracking-tight">
                {t('onboarding.create.make_sure_alone_title')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('onboarding.create.make_sure_alone_desc')}
              </p>
            </div>
            <Button onClick={handleReveal} className="w-full" size="lg">
              {t('onboarding.create.start_button')}
            </Button>
          </div>
        </div>
      )}

      <div className={cn('space-y-2', !isRevealed && 'blur-sm')}>
        <h1 className="text-xl font-bold">
          {t('onboarding.create.phrase_title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.create.phrase_desc')}
        </p>
      </div>

      <div className={cn('flex-1', !isRevealed && 'blur-sm')}>
        <SeedPhraseDisplay mnemonic={mnemonic} />

        <div className="flex flex-col gap-4 mt-2">
          <WalletKeysSheet mnemonic={mnemonic} />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="saved"
              checked={saved}
              onCheckedChange={(c) => setSaved(c as boolean)}
              disabled={!isRevealed}
            />
            <Label htmlFor="saved" className="text-sm">
              {t('onboarding.create.saved_label')}
            </Label>
          </div>
        </div>
      </div>

      <div className={cn('pt-2 flex gap-2', !isRevealed && 'blur-sm')}>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(-1)}
        >
          {t('onboarding.create.back_button')}
        </Button>
        <Button
          className="flex-1"
          disabled={!saved}
          onClick={handleNext}
        >
          {t('onboarding.create.next_button')}
        </Button>
      </div>
    </div>
  );
};
