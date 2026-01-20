import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/stores/session-store';
import { storage } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { PasswordSetupSheet } from '@/components/onboarding/password-setup-sheet';
import { MethodSelectionSheet } from '@/components/onboarding/method-selection-sheet';

export const WelcomePage: React.FC = () => {
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
    <div className="flex flex-col items-center justify-between h-full py-6 md:py-12 px-4 md:px-6 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center w-full gap-8 md:gap-12 min-h-[300px]">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display tracking-tight mb-8 md:mb-12">
            Clorio
          </h1>

          <div className="space-y-1 md:space-y-2">
            <h2 className="text-3xl sm:text-4xl md:text-5xl leading-tight font-serif">
              YOUR MINA
            </h2>
            <h2 className="text-3xl sm:text-4xl md:text-5xl leading-tight font-serif">
              YOUR CONTROL
            </h2>
          </div>
        </div>

        <div className="w-full max-w-[280px] sm:max-w-xs transition-all duration-300 ease-in-out">
          <Button
            size="lg"
            onClick={handleStart}
            className="w-full text-base md:text-lg h-10 md:h-12"
          >
            Let's start
          </Button>
        </div>
      </div>

      <div className="text-[10px] md:text-xs text-muted-foreground mt-4 md:mt-8 shrink-0">
        <button className="hover:underline">Terms of Service</button>
        <span className="mx-2">/</span>
        <button className="hover:underline">Privacy Policy</button>
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
