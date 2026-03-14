import React, { useCallback, useState } from 'react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
} from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeedPhraseInput } from '@/components/wallet/seed-phrase-input';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Key,
  Download,
  HardDrive,
  Loader2,
  GitBranch,
} from 'lucide-react';
import { VaultManager } from '@/lib/vault-manager';
import { BIP44Service } from '@/lib/bip44';
import { useWalletStore } from '@/stores/wallet-store';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { AppMessage, ValidatePrivateKeyResponse } from '@/messages/types';

export interface AddWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddMode = 'derive' | 'import-mnemonic' | 'import-privatekey' | 'ledger';

export const AddWalletDialog: React.FC<AddWalletDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { wallets, loadWallets } = useWalletStore();
  const { tempPassword } = useSessionStore();

  const [mode, setMode] = useState<AddMode>('derive');
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState('');

  // Check if user has a mnemonic wallet to derive from
  const hasMnemonicWallet = wallets.some((w) => w.type === 'mnemonic');

  const resetForm = () => {
    setWalletName('');
    setMnemonic([]);
    setPrivateKey('');
    setMode('derive');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleDeriveAccount = async () => {
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('wallets.errors.no_password', 'Password required'),
      });
      return;
    }

    setIsAdding(true);
    try {
      // Find first mnemonic wallet
      const mnemonicWallet = wallets.find((w) => w.type === 'mnemonic');
      if (!mnemonicWallet) {
        throw new Error('No mnemonic wallet found');
      }

      // Derive new account
      const derived = await VaultManager.deriveNewAccount(
        tempPassword,
        mnemonicWallet.id,
        walletName.trim() || undefined,
      );

      // Reload wallets
      await loadWallets();

      toast({
        title: t('wallets.add_success', 'Wallet added'),
        description: t(
          'wallets.add_success_desc',
          `Account #${derived.accountIndex} created`,
        ),
      });

      handleClose();
    } catch (error) {
      console.error('Failed to derive account:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.add_failed', 'Failed to add wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleImportMnemonic = async () => {
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('wallets.errors.no_password', 'Password required'),
      });
      return;
    }

    // Validate mnemonic
    const mnemonicString = mnemonic.join(' ').trim();
    if (mnemonicString.split(' ').length < 12) {
      toast({
        variant: 'destructive',
        title: t('wallets.errors.invalid_mnemonic', 'Invalid mnemonic'),
        description: t(
          'wallets.errors.invalid_mnemonic_desc',
          'Must be at least 12 words',
        ),
      });
      return;
    }

    setIsAdding(true);
    try {
      // Derive keys to verify and get public key
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

      // Add wallet to vault
      await VaultManager.addWallet(
        tempPassword,
        {
          name: walletName.trim() || `Imported Wallet`,
          secret: mnemonicString,
          type: 'mnemonic',
          derivationPath: BIP44Service.getDerivationPath(0),
          accountIndex: 0,
        },
        { setAsActive: true },
      );

      // Reload wallets
      await loadWallets();

      toast({
        title: t('wallets.add_success', 'Wallet added'),
        description: t('wallets.add_success_desc_import', 'Wallet imported'),
      });

      handleClose();
    } catch (error) {
      console.error('Failed to import mnemonic:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.add_failed', 'Failed to add wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleImportPrivateKey = async () => {
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('wallets.errors.no_password', 'Password required'),
      });
      return;
    }

    const trimmedKey = privateKey.trim();

    // Validate format
    if (!trimmedKey.startsWith('EK')) {
      toast({
        variant: 'destructive',
        title: t('wallets.errors.invalid_private_key', 'Invalid private key'),
        description: t(
          'wallets.errors.invalid_private_key_desc',
          'Private key must start with EK',
        ),
      });
      return;
    }

    setIsAdding(true);
    try {
      // Validate private key
      const message: AppMessage = {
        type: 'VALIDATE_PRIVATE_KEY',
        payload: { privateKey: trimmedKey },
      };
      const response = (await chrome.runtime.sendMessage(
        message,
      )) as ValidatePrivateKeyResponse;

      if (!response.isValid) {
        throw new Error('Invalid private key');
      }

      // Add wallet to vault
      await VaultManager.addWallet(
        tempPassword,
        {
          name: walletName.trim() || `Imported Wallet`,
          secret: trimmedKey,
          type: 'privateKey',
        },
        { setAsActive: true },
      );

      // Reload wallets
      await loadWallets();

      toast({
        title: t('wallets.add_success', 'Wallet added'),
        description: t('wallets.add_success_desc_import', 'Wallet imported'),
      });

      handleClose();
    } catch (error) {
      console.error('Failed to import private key:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.add_failed', 'Failed to add wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleLedgerImport = useCallback(() => {
    const popupUrl = chrome.runtime.getURL(
      'src/popup/index.html#/onboarding/ledger',
    );
    chrome.tabs.create({ url: popupUrl, active: true });
    handleClose();
    window.close();
  }, [handleClose]);

  const handleSubmit = () => {
    switch (mode) {
      case 'derive':
        handleDeriveAccount();
        break;
      case 'import-mnemonic':
        handleImportMnemonic();
        break;
      case 'import-privatekey':
        handleImportPrivateKey();
        break;
      case 'ledger':
        handleLedgerImport();
        break;
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={handleClose}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>
            {t('wallets.add_wallet', 'Add Wallet')}
          </BottomSheetTitle>
          <BottomSheetDescription>
            {t(
              'wallets.add_wallet_desc',
              'Choose how you want to add a new wallet',
            )}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as AddMode)}
          className="px-4 py-2"
        >
          <TabsList className="grid w-full grid-cols-4">
            {hasMnemonicWallet && (
              <TabsTrigger value="derive">
                <GitBranch className="w-4 h-4" />
              </TabsTrigger>
            )}
            <TabsTrigger value="import-mnemonic">
              <Download className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="import-privatekey">
              <Key className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="ledger">
              <HardDrive className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          {/* Derive from existing */}
          {hasMnemonicWallet && (
            <TabsContent value="derive" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {t('wallets.derive_title', 'Derive New Account')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'wallets.derive_desc',
                    'Create a new account from your existing seed using BIP44',
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="derive-name">
                  {t('wallets.wallet_name', 'Wallet Name')}{' '}
                  <span className="text-muted-foreground">
                    ({t('common.optional', 'optional')})
                  </span>
                </Label>
                <Input
                  id="derive-name"
                  placeholder={t(
                    'wallets.wallet_name_placeholder',
                    'My Wallet',
                  )}
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  maxLength={50}
                />
              </div>
            </TabsContent>
          )}

          {/* Import Mnemonic */}
          <TabsContent value="import-mnemonic" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">
                {t('wallets.import_mnemonic_title', 'Import Mnemonic')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  'wallets.import_mnemonic_desc',
                  'Import a wallet using a 12 or 24 word recovery phrase',
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mnemonic-name">
                {t('wallets.wallet_name', 'Wallet Name')}{' '}
                <span className="text-muted-foreground">
                  ({t('common.optional', 'optional')})
                </span>
              </Label>
              <Input
                id="mnemonic-name"
                placeholder={t('wallets.wallet_name_placeholder', 'My Wallet')}
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('wallets.recovery_phrase', 'Recovery Phrase')}</Label>
              <SeedPhraseInput onChange={setMnemonic} />
            </div>
          </TabsContent>

          {/* Import Private Key */}
          <TabsContent value="import-privatekey" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">
                {t('wallets.import_privatekey_title', 'Import Private Key')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  'wallets.import_privatekey_desc',
                  'Import a wallet using a private key (starting with EK)',
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pk-name">
                {t('wallets.wallet_name', 'Wallet Name')}{' '}
                <span className="text-muted-foreground">
                  ({t('common.optional', 'optional')})
                </span>
              </Label>
              <Input
                id="pk-name"
                placeholder={t('wallets.wallet_name_placeholder', 'My Wallet')}
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="private-key">
                {t('wallets.private_key', 'Private Key')}
              </Label>
              <Input
                id="private-key"
                type="password"
                placeholder="EK..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Ledger */}
          <TabsContent value="ledger" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">
                {t('wallets.connect_ledger_title', 'Connect Ledger')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  'wallets.connect_ledger_desc',
                  'Connect your Ledger hardware wallet via USB',
                )}
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <HardDrive className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {t('wallets.ledger_step_1', '1. Connect your Ledger')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'wallets.ledger_step_1_desc',
                      'Make sure it is unlocked and the Mina app is open',
                    )}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {t('wallets.ledger_step_2', '2. Import account')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'wallets.ledger_step_2_desc',
                      'You will be redirected to the Ledger import page',
                    )}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex gap-2 p-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isAdding} className="flex-1">
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.adding', 'Adding...')}
              </>
            ) : mode === 'ledger' ? (
              <>
                <HardDrive className="w-4 h-4 mr-2" />
                {t('wallets.connect_ledger', 'Connect Ledger')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('wallets.add_wallet', 'Add Wallet')}
              </>
            )}
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
};

export default AddWalletDialog;
