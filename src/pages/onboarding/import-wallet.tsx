import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeedPhraseInput } from '@/components/wallet/seed-phrase-input';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { AppMessage, ValidatePrivateKeyResponse } from '@/messages/types';
import { useWalletStore } from '@/stores/wallet-store';
import { useTranslation } from 'react-i18next';
import { VaultManager } from '@/lib/vault-manager';
import { BIP44Service } from '@/lib/bip44';
import { DEFAULT_WALLET_NAME_PREFIX } from '@/lib/types/vault';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export const ImportWalletPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tempPassword, setHasVault, setIsAuthenticated } = useSessionStore();
  const { setWallet } = useWalletStore();
  const [activeTab, setActiveTab] = useState<'mnemonic' | 'privateKey'>(
    'mnemonic',
  );
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugKeys, setDebugKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);

  const handleFinish = async () => {
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t('onboarding.create.error_password'),
      });
      navigate('/');
      return;
    }

    if (activeTab === 'mnemonic') {
      if (mnemonic.some((w) => !w)) {
        toast({
          variant: 'destructive',
          title: t('onboarding.import.error_invalid_mnemonic'),
          description: t('onboarding.import.error_invalid_mnemonic_desc'),
        });
        return;
      }
    } else {
      if (!privateKey.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: t('onboarding.import.error_private_key_required'),
        });
        return;
      }
    }

    setIsImporting(true);

    try {
      let secret: string;
      let walletType: 'mnemonic' | 'privateKey';
      let derivedPublicKey: string;

      if (activeTab === 'mnemonic') {
        walletType = 'mnemonic';
        const mnemonicString = mnemonic.join(' ');
        secret = mnemonicString;

        // Derive keys to get public key
        const message: AppMessage = {
          type: 'DERIVE_KEYS_FROM_MNEMONIC',
          payload: { mnemonic: mnemonicString, accountIndex: 0 },
        };
        const response = (await chrome.runtime.sendMessage(message)) as
          | { publicKey: string; privateKey: string }
          | { error: string };

        if ('error' in response) {
          throw new Error(response.error);
        }
        derivedPublicKey = response.publicKey;
        setDebugKeys(response);
      } else {
        walletType = 'privateKey';
        if (!privateKey.startsWith('EK')) {
          toast({
            variant: 'destructive',
            title: t('onboarding.import.error_invalid_private_key'),
            description: t('onboarding.import.error_invalid_private_key_desc'),
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
            title: t('onboarding.import.error_invalid_private_key'),
            description: t('onboarding.import.error_invalid_private_key_desc'),
          });
          setIsImporting(false);
          return;
        }
        secret = privateKey.trim();
        derivedPublicKey = response.publicKey || '';
        setDebugKeys({
          publicKey: derivedPublicKey,
          privateKey: secret,
        });
      }

      // Create vault v2 with imported wallet
      const vault = await VaultManager.createVault(tempPassword, {
        name: `${DEFAULT_WALLET_NAME_PREFIX}1`,
        secret,
        type: walletType,
        derivationPath:
          walletType === 'mnemonic'
            ? BIP44Service.getDerivationPath(0)
            : undefined,
        accountIndex: walletType === 'mnemonic' ? 0 : undefined,
      });

      const firstWallet = vault.wallets[0];

      setHasVault(true);
      setIsAuthenticated(true);

      // Set wallet in store with v2 format
      setWallet({
        publicKey: firstWallet.publicKey,
        accountId: null,
        walletId: firstWallet.id,
        accountType: 'software',
        accountName: firstWallet.name,
      });

      setShowDebug(true);

      toast({
        title: t('onboarding.import.success_title'),
        description: t('onboarding.import.success_desc'),
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
    <div className="flex flex-col h-full">
      <div className="flex-none p-4 space-y-2">
        <h1 className="text-xl font-bold">{t('onboarding.import.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.import.desc')}
        </p>
      </div>

      <Tabs
        defaultValue="mnemonic"
        className="flex flex-col flex-1 overflow-hidden"
        onValueChange={(val) => setActiveTab(val as 'mnemonic' | 'privateKey')}
      >
        <div className="px-4 shrink-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mnemonic">
              {t('onboarding.import.tab_mnemonic')}
            </TabsTrigger>
            <TabsTrigger value="privateKey">
              {t('onboarding.import.tab_private_key')}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <TabsContent value="mnemonic" className="mt-0 space-y-4 h-full">
            <div className="space-y-2">
              <Label>{t('onboarding.import.input_label_mnemonic')}</Label>
              <SeedPhraseInput length={12} onChange={setMnemonic} />
            </div>
          </TabsContent>
          <TabsContent value="privateKey" className="mt-0 space-y-4 h-full">
            <div className="space-y-2">
              <Label htmlFor="private-key">
                {t('onboarding.import.input_label_private_key')}
              </Label>
              <Input
                id="private-key"
                placeholder={t(
                  'onboarding.import.input_placeholder_private_key',
                )}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                {t('onboarding.import.private_key_hint')}
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="flex-none p-4 pt-0 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => navigate(-1)}
        >
          {t('onboarding.create.back_button')}
        </Button>
        <Button
          className="flex-1"
          onClick={handleFinish}
          disabled={isImporting}
        >
          {isImporting
            ? t('onboarding.import.button_importing')
            : t('onboarding.import.button_import')}
        </Button>
      </div>

      <Dialog
        open={showDebug}
        onOpenChange={(open) => !open && handleCloseDebug()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('onboarding.import.debug_title')}</DialogTitle>
            <DialogDescription>
              {t('onboarding.import.debug_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {t('onboarding.wallet_keys_sheet.public_key_label')}
              </Label>
              <div className="p-2 bg-muted rounded-md break-all font-mono text-xs">
                {debugKeys?.publicKey}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {t('onboarding.wallet_keys_sheet.private_key_label')}
              </Label>
              <div className="p-2 bg-muted rounded-md break-all font-mono text-xs">
                {debugKeys?.privateKey}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDebug}>
              {t('onboarding.import.go_dashboard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
