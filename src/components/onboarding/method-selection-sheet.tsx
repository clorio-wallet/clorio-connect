import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '@/components/ui/bottom-sheet';
import { useTranslation } from 'react-i18next';

interface MethodSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MethodSelectionSheet: React.FC<MethodSelectionSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="h-auto">
        <BottomSheetHeader className="text-left px-6 pt-6">
          <BottomSheetTitle className="text-3xl font-display font-normal">
            {t('onboarding.method_sheet.title')}
          </BottomSheetTitle>
          <BottomSheetDescription className="text-base mt-2 text-muted-foreground">
            {t('onboarding.method_sheet.desc')}
          </BottomSheetDescription>
        </BottomSheetHeader>

        <div className="px-6 py-6 flex flex-col gap-4">
          <Button
            size="lg"
            onClick={() => navigate('/onboarding/create')}
            className="w-full text-lg h-12"
          >
            {t('onboarding.method_sheet.create_new')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/onboarding/import')}
            className="w-full text-lg h-12"
          >
            {t('onboarding.method_sheet.import_phrase')}
          </Button>
        </div>
        <BottomSheetFooter className="pb-8" />
      </BottomSheetContent>
    </BottomSheet>
  );
};
