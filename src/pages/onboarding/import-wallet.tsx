import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { useSessionStore } from '@/stores/session-store';
import { CryptoService } from '@/lib/crypto';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { SeedPhraseInput } from '@/components/wallet/seed-phrase-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppMessage, ValidatePrivateKeyResponse, DeriveKeysResponse } from '@/messages/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export const ImportWalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tempPassword, setHasVault, setIsAuthenticated } = useSessionStore();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'mnemonic' | 'privateKey'>(
    'mnemonic',
  );
  const [privateKey, setPrivateKey] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [debugKeys, setDebugKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

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

    setIsImporting(true);
    try {
      let secretToEncrypt = '';
      const secretType = activeTab;
      let derivedKeys: { publicKey: string; privateKey: string } | null = null;

      if (activeTab === 'mnemonic') {
        const mnemonicString = mnemonic
          .map((w) => w.trim().toLowerCase())
          .join(' ');
        if (!validateMnemonic(mnemonicString, wordlist)) {
          toast({
            variant: 'destructive',
            title: 'Invalid Seed Phrase',
            description: 'Please check your seed phrase and try again.',
          });
          setIsImporting(false);
          return;
        }
        secretToEncrypt = mnemonicString;

        // Derive keys for debug
        const message: AppMessage = {
          type: 'DERIVE_KEYS_FROM_MNEMONIC',
          payload: { mnemonic: mnemonicString },
        };
        const response = (await chrome.runtime.sendMessage(message)) as DeriveKeysResponse | { error: string };
        if ('error' in response) {
          throw new Error(response.error);
        }
        derivedKeys = { publicKey: response.publicKey, privateKey: response.privateKey };

      } else {
        if (!privateKey.trim()) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Private key is required.',
          });
          setIsImporting(false);
          return;
        }

        const message: AppMessage = {
          type: 'VALIDATE_PRIVATE_KEY',
          payload: { privateKey: privateKey.trim() },
        };
        const response = (await chrome.runtime.sendMessage(
          message,
        )) as ValidatePrivateKeyResponse;

        if (!response.isValid) {
          toast({
            variant: 'destructive',
            title: 'Invalid Private Key',
            description: 'Please check your private key and try again.',
          });
          setIsImporting(false);
          return;
        }
        secretToEncrypt = privateKey.trim();
        derivedKeys = { publicKey: response.publicKey || '', privateKey: privateKey.trim() };
      }

      // Encrypt the secret
      const encryptedData = await CryptoService.encrypt(
        secretToEncrypt,
        tempPassword,
      );

      // Save vault
      await storage.set('clorio_vault', {
        encryptedSeed: encryptedData.ciphertext,
        salt: encryptedData.salt,
        iv: encryptedData.iv,
        version: 1,
        type: secretType,
        createdAt: Date.now(),
      });

      setHasVault(true);
      setIsAuthenticated(true);

      setDebugKeys(derivedKeys);
      setShowDebug(true);

      toast({
        title: 'Wallet Imported',
        description: 'Your wallet has been successfully imported.',
      });

    } catch (error) {
      console.error('Failed to import wallet:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to import wallet.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseDebug = () => {
    setShowDebug(false);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col h-full space-y-6 py-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Import Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Import your wallet using your Secret Recovery Phrase or Private Key.
        </p>
      </div>

      <Tabs
        defaultValue="mnemonic"
        className="w-full"
        onValueChange={(val) => setActiveTab(val as 'mnemonic' | 'privateKey')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mnemonic">Mnemonic</TabsTrigger>
          <TabsTrigger value="privateKey">Private Key</TabsTrigger>
        </TabsList>
        <TabsContent value="mnemonic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Secret Recovery Phrase</Label>
            <SeedPhraseInput length={12} onChange={setMnemonic} />
          </div>
        </TabsContent>
        <TabsContent value="privateKey" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="private-key">Private Key</Label>
            <Input
              id="private-key"
              placeholder="Enter your private key (Base58)"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Your private key is a long string starting with 'EK'.
            </p>
          </div>
        </TabsContent>
      </Tabs>

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
          onClick={handleFinish}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import'}
        </Button>
      </div>

      <Dialog open={showDebug} onOpenChange={(open) => !open && handleCloseDebug()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Imported (Debug)</DialogTitle>
            <DialogDescription>
              Verify your keys below. This dialog is for debugging purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Public Key</Label>
              <div className="p-2 bg-muted rounded-md break-all font-mono text-xs">
                {debugKeys?.publicKey}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Private Key</Label>
              <div className="p-2 bg-muted rounded-md break-all font-mono text-xs">
                {debugKeys?.privateKey}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDebug}>Go to Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
