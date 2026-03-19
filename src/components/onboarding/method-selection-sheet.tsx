import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
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

  const handleLedgerImport = useCallback(() => {
    const popupUrl = chrome.runtime.getURL(
      'src/popup/index.html#/onboarding/ledger',
    );
    chrome.tabs.create({ url: popupUrl, active: true });
    window.close();
  }, []);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="h-auto">
        <BottomSheetHeader className="text-left px-6 pt-6">
          <BottomSheetTitle className="text-3xl font-display font-normal ">
            {t('onboarding.method_sheet.title')}
          </BottomSheetTitle>
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
          <Button
            variant="outline"
            size="lg"
            onClick={handleLedgerImport}
            className="w-full text-lg h-12 gap-2"
          >
            {t('onboarding.method_sheet.import_ledger')}
          </Button>
        </div>
        <BottomSheetFooter className="pb-8" />
      </BottomSheetContent>
    </BottomSheet>
  );
};
