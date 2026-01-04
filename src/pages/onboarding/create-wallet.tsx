import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SeedPhraseDisplay } from '@/components/wallet/seed-phrase-display';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useSessionStore } from '@/stores/session-store';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

export const CreateWalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tempPassword, setHasVault, setIsAuthenticated } = useSessionStore();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Generate mnemonic on mount
    const mn = generateMnemonic(wordlist);
    setMnemonic(mn.split(' '));
  }, []);

  const handleFinish = async () => {
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Password not set. Please restart onboarding.',
      });
      navigate('/');
      return;
    }

    setIsCreating(true);
    try {
      const mnemonicString = mnemonic.join(' ');

      // Encrypt the mnemonic
      const encryptedData = await CryptoService.encrypt(
        mnemonicString,
        tempPassword,
      );

      // Save vault
      await storage.set('clorio_vault', {
        encryptedSeed: encryptedData.ciphertext,
        salt: encryptedData.salt,
        iv: encryptedData.iv,
        version: 1,
        createdAt: Date.now(),
      });

      setHasVault(true);
      setIsAuthenticated(true);

      toast({
        title: 'Wallet Created',
        description: 'Your wallet has been successfully created.',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create wallet:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create wallet.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 py-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Secret Recovery Phrase</h1>
        <p className="text-sm text-muted-foreground">
          This phrase is the ONLY way to recover your wallet. Do not share it
          with anyone.
        </p>
      </div>

      <SeedPhraseDisplay mnemonic={mnemonic} />

      <div className="flex items-center space-x-2 mt-4">
        <Checkbox
          id="saved"
          checked={saved}
          onCheckedChange={(c) => setSaved(c as boolean)}
        />
        <Label htmlFor="saved" className="text-sm">
          I have saved my secret recovery phrase
        </Label>
      </div>

      <div className="pt-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={!saved || isCreating}
          onClick={handleFinish}
        >
          {isCreating ? 'Creating...' : 'Finish'}
        </Button>
      </div>
    </div>
  );
};
