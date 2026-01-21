import React from 'react';
import type { Resource } from 'i18next';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetClose,
} from '@/components/ui/bottom-sheet';

interface LanguageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGE_META: Record<
  string,
  {
    label: string;
    nativeName: string;
  }
> = {
  en: { label: 'English', nativeName: 'English' },
  es: { label: 'Spanish', nativeName: 'Español' },
  fr: { label: 'French', nativeName: 'Français' },
  de: { label: 'German', nativeName: 'Deutsch' },
};

export const LanguageSheet: React.FC<LanguageSheetProps> = ({ open, onOpenChange }) => {
  const { t, i18n } = useTranslation();

  const resources = i18n.options.resources as Resource | undefined;
  const resourceLanguages = resources ? Object.keys(resources) : [];
  const availableLanguages = resourceLanguages.map((code) => {
    const meta = LANGUAGE_META[code] || {};
    return {
      code,
      nativeName: meta.nativeName || code,
      label: meta.label || code.toUpperCase(),
    };
  });

  const currentLangCode = i18n.language.split('-')[0];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('settings.language_title', 'Select Language')}</BottomSheetTitle>
          <BottomSheetDescription>
            {t('settings.language_desc', 'Choose your preferred language.')}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="p-4 space-y-2">
          {availableLanguages.map((lang) => (
            <div
              key={lang.code}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                currentLangCode === lang.code
                  ? "bg-accent border-primary/50"
                  : "hover:bg-accent/50 border-transparent"
              )}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                onOpenChange(false);
              }}
              >
              <div className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.label}</span>
              </div>
              {currentLangCode === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          ))}
        </div>
        <BottomSheetFooter>
          <BottomSheetClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </BottomSheetClose>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
};
