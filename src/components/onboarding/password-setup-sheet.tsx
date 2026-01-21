import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/wallet/password-input';
import { Label } from '@/components/ui/label';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { Checkbox } from '../ui/checkbox';
import { useTranslation } from 'react-i18next';

interface PasswordSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (password: string) => void;
}

export const PasswordSetupSheet: React.FC<PasswordSetupSheetProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length > 8) score += 25;
    if (pass.length > 12) score += 25;
    if (/[A-Z]/.test(pass)) score += 15;
    if (/[0-9]/.test(pass)) score += 15;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;
    return Math.min(score, 100);
  };

  const strength = calculateStrength(password);

  const getStrengthLabel = (s: number) => {
    if (s === 0) return '';
    if (s < 30) return t('onboarding.password_sheet.strength_weak');
    if (s < 60) return t('onboarding.password_sheet.strength_kinda_weak');
    if (s < 80) return t('onboarding.password_sheet.strength_strong');
    return t('onboarding.password_sheet.strength_very_strong');
  };

  const getStrengthColor = (s: number) => {
    if (s < 30) return 'bg-destructive';
    if (s < 60) return 'bg-yellow-500';
    if (s < 80) return 'bg-green-500';
    return 'bg-green-600';
  };

  const handleContinue = () => {
    if (password !== confirmPassword) return;
    onSuccess(password);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="h-[90vh] sm:h-[85vh]">
        <BottomSheetHeader className="text-left px-6 pt-6">
          <BottomSheetTitle className="text-4xl font-display font-normal">
            {t('onboarding.password_sheet.title')}
          </BottomSheetTitle>
          <BottomSheetDescription className="text-base mt-2 text-muted-foreground">
            {t('onboarding.password_sheet.desc')}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('onboarding.password_sheet.password_label')}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="bg-muted/50"
              />

              {password && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t('onboarding.password_sheet.strength_label')}{' '}
                      <span
                        className={getStrengthColor(strength).replace(
                          'bg-',
                          'text-',
                        )}
                      >
                        {getStrengthLabel(strength)}
                      </span>
                    </span>
                  </div>
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor(strength)}`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('onboarding.password_sheet.confirm_password_label')}</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className="bg-muted/50"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">
                  {t('onboarding.password_sheet.password_mismatch')}
                </p>
              )}
            </div>
          </div>
        </div>

        <BottomSheetFooter className="px-6 pb-8 pt-2">
          <div className="flex items-center space-x-2 mb-6">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(c) => setAcceptedTerms(c as boolean)}
            />
            <Label
              htmlFor="terms"
              className="text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('onboarding.password_sheet.terms_label')}
            </Label>
          </div>

          <Button
            className="w-full h-12 text-lg"
            onClick={handleContinue}
            disabled={
              !password ||
              !confirmPassword ||
              password !== confirmPassword ||
              !acceptedTerms
            }
          >
            {t('onboarding.create.next_button')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
