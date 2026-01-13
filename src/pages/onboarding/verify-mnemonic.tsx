import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/stores/session-store';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

export const VerifyMnemonicPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    tempPassword,
    tempMnemonic,
    setTempMnemonic,
    setHasVault,
    setIsAuthenticated,
  } = useSessionStore();

  const [isCreating, setIsCreating] = useState(false);
  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);
  const [verificationValues, setVerificationValues] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    if (!tempMnemonic || !tempPassword) {
      toast({
        variant: 'destructive',
        title: 'Session Expired',
        description: 'Please restart the wallet creation process.',
      });
      navigate('/');
      return;
    }

    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * 12));
    }
    setVerificationIndices(Array.from(indices).sort((a, b) => a - b));
  }, [tempMnemonic, tempPassword, navigate, toast]);

  const handleVerifyAndFinish = async () => {
    if (!tempMnemonic || !tempPassword) return;

    for (const index of verificationIndices) {
      const input = verificationValues[index]?.trim().toLowerCase();
      if (input !== tempMnemonic[index]) {
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: `Word #${index + 1} is incorrect. Please check your seed phrase.`,
        });
        return;
      }
    }

    setIsCreating(true);
    try {
      const mnemonicString = tempMnemonic.join(' ');

      const encryptedData = await CryptoService.encrypt(
        mnemonicString,
        tempPassword,
      );

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

      setTempMnemonic(null);

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
        <h1 className="text-xl font-bold">Verify Seed Phrase</h1>
        <p className="text-sm text-muted-foreground">
          Enter the requested words from your seed phrase to verify you saved
          it.
        </p>
      </div>
      <div className="flex-1 space-y-4">
        {verificationIndices.map((index) => (
          <div key={index} className="space-y-2">
            <Label htmlFor={`word-${index}`}>Word #{index + 1}</Label>
            <Input
              id={`word-${index}`}
              placeholder={`Enter word #${index + 1}`}
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
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={Object.keys(verificationValues).length !== 3 || isCreating}
          onClick={handleVerifyAndFinish}
        >
          {isCreating ? 'Creating...' : 'Verify & Create'}
        </Button>
      </div>
    </div>
  );
};
