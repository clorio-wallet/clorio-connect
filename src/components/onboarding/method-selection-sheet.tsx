import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive } from 'lucide-react';
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

  // Auro pattern: open the Ledger import page in a full browser tab.
  // WebUSB (navigator.usb.requestDevice) requires a user-visible top-level
  // tab — it cannot be called from the extension popup or side panel.
  // By opening the same popup.html with the #/onboarding/ledger hash route
  // in a tab, the full React app loads with WebUSB access and can call
  // TransportWebUSB.create() directly — no APDU proxy needed.
  // The tab's App.tsx calls restoreSession() on mount which reads
  // clorio_onboarding_password from chrome.storage.session — no extra
  // password passing needed here.
  const handleLedgerImport = useCallback(() => {
    const popupUrl = chrome.runtime.getURL('src/popup/index.html#/onboarding/ledger');
    chrome.tabs.create({ url: popupUrl, active: true });
    // Close the popup/sidepanel — the user continues in the new tab.
    window.close();
  }, []);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="h-auto">
        <BottomSheetHeader className="text-left px-6 pt-6">
          <BottomSheetTitle className="text-3xl font-alt font-normal">
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
          <Button
            variant="outline"
            size="lg"
            onClick={handleLedgerImport}
            className="w-full text-lg h-12 gap-2"
          >
            <HardDrive className="h-5 w-5 shrink-0" />
            {t('onboarding.method_sheet.import_ledger')}
          </Button>
        </div>
        <BottomSheetFooter className="pb-8" />
      </BottomSheetContent>
    </BottomSheet>
  );
};
