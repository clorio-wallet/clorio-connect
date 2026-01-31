import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session-store';
import { storage } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { PasswordSetupSheet } from '@/components/onboarding/password-setup-sheet';
import { MethodSelectionSheet } from '@/components/onboarding/method-selection-sheet';
import { useTranslation } from 'react-i18next';
import ClorioConnectLogo from '@/components/ui/logo';

export const WelcomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const { tempPassword, setTempPassword, setHasVault } = useSessionStore();

  useEffect(() => {
    const checkVault = async () => {
      const vault = await storage.get('clorio_vault');
      if (vault) {
        setHasVault(true);
        navigate('/wallet-unlock');
      }
    };
    checkVault();
  }, [navigate, setHasVault]);

  const handleStart = () => {
    if (tempPassword) {
      setShowMethodSelection(true);
    } else {
      setShowPasswordSetup(true);
    }
  };

  const handlePasswordSuccess = (password: string) => {
    setTempPassword(password);
    setShowPasswordSetup(false);
    setTimeout(() => setShowMethodSelection(true), 300);
  };

  return (
    <div className="flex flex-col items-center justify-between h-[100vh] py-6 md:py-12 px-4 md:px-6 overflow-y-auto">
      <ClorioConnectLogo className="w-[25vw]" />
      <div className="flex-1 flex flex-col items-center justify-center w-full gap-8 md:gap-12 min-h-[300px]">
        <div className="text-center flex flex-col items-center justify-center gap-4">
          <div className="space-y-1 md:space-y-2">
            <h2 className="text-5xl sm:text-4xl md:text-5xl font-alt">
              {t('welcome.subtitle_1')}
            </h2>
            <h2 className="text-5xl sm:text-4xl md:text-5xl font-alt leading-tight">
              {t('welcome.subtitle_2')}
            </h2>
          </div>
        </div>

        <div className="w-full max-w-[280px] sm:max-w-xs transition-all duration-300 ease-in-out">
          <Button
            size="lg"
            onClick={handleStart}
            className="w-full text-base md:text-lg h-10 md:h-12"
          >
            {t('welcome.start_button')}
          </Button>
        </div>
      </div>

      <div className="text-[10px] md:text-xs text-muted-foreground mt-4 md:mt-8 shrink-0">
        <button className="hover:underline">{t('welcome.terms')}</button>
        <span className="mx-2">/</span>
        <button className="hover:underline">{t('welcome.privacy')}</button>
      </div>

      <PasswordSetupSheet
        open={showPasswordSetup}
        onOpenChange={setShowPasswordSetup}
        onSuccess={handlePasswordSuccess}
      />

      <MethodSelectionSheet
        open={showMethodSelection}
        onOpenChange={setShowMethodSelection}
      />
    </div>
  );
};
