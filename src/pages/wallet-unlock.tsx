import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PasswordInput } from '@/components/wallet/password-input';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';
import { storage, sessionStorage } from '@/lib/storage';
import { CryptoService } from '@/lib/crypto';
import { useSessionStore } from '@/stores/session-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useToast } from '@/hooks/use-toast';

import { LoopingLottie } from '@/components/ui/looping-lottie';
import lockAnimation from '../animations/lock.json';

interface VaultData {
  encryptedSeed: string;
  salt: string;
  iv: string;
  version: number;
  type?: 'mnemonic' | 'privateKey';
}

const WalletUnlockPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setIsAuthenticated, setHasVault, setTempPassword, isAuthenticated } =
    useSessionStore();
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
      const vault = await storage.get<VaultData>('clorio_vault');

      if (!vault) {
        toast({
          variant: 'destructive',
          title: 'No Wallet Found',
          description: 'Please create or import a wallet first.',
        });
        navigate('/welcome'); // Or wherever the start is
        return;
      }

      // Attempt decryption to verify password
      await CryptoService.decrypt(
        vault.encryptedSeed,
        password,
        vault.salt,
        vault.iv,
      );

      // If successful:
      setIsAuthenticated(true);
      setHasVault(true);
      setTempPassword(password); // Store password in session for subsequent operations

      // Save session if persistence is enabled
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
        title: 'Incorrect Password',
        description: 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[100vh]">
      <div className="w-[200px] h-[200px]">
        <LoopingLottie animationData={lockAnimation} loopLastSeconds={3} />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Enter your password to unlock your wallet
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUnlock}>
          <CardContent className="space-y-4">
            <PasswordInput
              id="password"
              placeholder="Enter password"
              label="Password"
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
              {isLoading ? 'Unlocking...' : 'Unlock'}
            </Button>
            <Button
              variant="link"
              className="w-full text-xs text-muted-foreground"
              type="button"
              onClick={() => navigate('/onboarding/import')}
            >
              Forgot password? Reset wallet
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default WalletUnlockPage;
