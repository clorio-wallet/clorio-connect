import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResetWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResetWalletDialog: React.FC<ResetWalletDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resetWallet } = useSessionStore();
  const { toast } = useToast();

  const handleResetWallet = async () => {
    await resetWallet();
    toast({
      title: t('settings.reset_sheet.success_title'),
      description: t('settings.reset_sheet.success_desc'),
    });
    navigate('/welcome');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('settings.reset_sheet.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings.reset_sheet.desc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResetWallet}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('settings.reset_sheet.confirm_button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
