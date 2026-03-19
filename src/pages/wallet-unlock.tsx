import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeaderWithAction,
  CardTitle,
} from '@/components/ui/card';
import { PasswordInput } from '@/components/wallet/password-input';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';
import { storage, sessionStorage } from '@/lib/storage';
import { CryptoService } from '@/lib/crypto';
import { VaultManager } from '@/lib/vault-manager';
import { useSessionStore } from '@/stores/session-store';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';

import { LoopingLottie } from '@/components/ui/looping-lottie';
import lockAnimation from '../animations/lock.json';

interface VaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type?: 'mnemonic' | 'privateKey' | 'ledger';
}

interface LedgerAccountData {
  address: string;
  accountName: string;
  accountIndex: number;
  type: 'ledger';
}

const WalletUnlockPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setIsAuthenticated, setHasVault, setTempPassword, isAuthenticated } =
    useSessionStore();
  const { setWallet } = useWalletStore();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    try {
      const vaultV2 = await VaultManager.loadVault();

      if (vaultV2) {
        try {
          await VaultManager.getPrivateKey(password, vaultV2.activeWalletId);
        } catch {
          throw new Error('Incorrect password');
        }

        const { loadWallets } = useWalletStore.getState();
        await loadWallets();

        setIsAuthenticated(true);
        setHasVault(true);
        setTempPassword(password);

        const { autoLockTimeout } = useSettingsStore.getState();
        if (autoLockTimeout !== 0) {
          await sessionStorage.set('clorio_session', {
            password,
            timestamp: Date.now(),
          });
        }

        navigate('/dashboard');
        return;
      }

      const legacyVault = await storage.get<VaultData>('clorio_vault');

      if (!legacyVault) {
        toast({
          variant: 'destructive',
          title: t('wallet_unlock.error_no_wallet_title'),
          description: t('wallet_unlock.error_no_wallet_desc'),
        });
        navigate('/welcome');
        return;
      }

      await CryptoService.decrypt(
        legacyVault.encryptedSeed,
        password,
        legacyVault.salt,
        legacyVault.iv,
      );

      if (legacyVault.type === 'ledger') {
        const ledgerAccount = await storage.get<LedgerAccountData>(
          'clorio_ledger_account',
        );
        if (ledgerAccount?.type === 'ledger') {
          setWallet({
            publicKey: ledgerAccount.address,
            accountId: null,
            accountType: 'ledger',
            accountName: ledgerAccount.accountName,
            ledgerAccountIndex: ledgerAccount.accountIndex,
          });
        }
      }

      setIsAuthenticated(true);
      setHasVault(true);
      setTempPassword(password);

      const { autoLockTimeout } = useSettingsStore.getState();
      if (autoLockTimeout !== 0) {
        await sessionStorage.set('clorio_session', {
          password,
          timestamp: Date.now(),
        });
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: t('wallet_unlock.error_incorrect_password_title'),
        description: t('wallet_unlock.error_incorrect_password_desc'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex w-full flex-col items-center justify-center overflow-hidden p-4">
      <div className="w-[30vh] h-[30vh] max-w-[200px] max-h-[200px] min-w-[120px] min-h-[120px] shrink-0 mb-6">
        <LoopingLottie animationData={lockAnimation} loopLastSeconds={3} />
      </div>
      <Card className="w-full max-w-sm shrink-0 shadow-lg">
        <CardHeaderWithAction
          action={
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="rounded-full text-muted-foreground"
              onClick={() => navigate('/prelogin-settings')}
              title={t('settings.title', 'Settings')}
              aria-label={t('settings.title', 'Settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          }
        >
          <CardTitle>{t('wallet_unlock.title')}</CardTitle>
          <CardDescription>{t('wallet_unlock.desc')}</CardDescription>
        </CardHeaderWithAction>
        <form onSubmit={handleUnlock}>
          <CardContent className="space-y-4">
            <PasswordInput
              id="password"
              placeholder={t('wallet_unlock.password_placeholder')}
              label={t('wallet_unlock.password_label')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={!password || isLoading}
            >
              {isLoading
                ? t('wallet_unlock.unlocking')
                : t('wallet_unlock.unlock_button')}
            </Button>
            <Button
              variant="link"
              className="w-full text-xs text-muted-foreground"
              type="button"
              onClick={() => navigate('/onboarding/import')}
            >
              {t('wallet_unlock.forgot_password')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default WalletUnlockPage;
