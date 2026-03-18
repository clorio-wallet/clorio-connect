import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  ShieldCheck,
  Languages,
  RefreshCw,
  Layout,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection } from '@/components/settings/settings-section';
import { SettingsItem } from '@/components/settings/settings-item';
import { NetworkSheet } from '@/components/settings/network-sheet';
import { SecuritySheet } from '@/components/settings/security-sheet';
import { RefreshRateSheet } from '@/components/settings/refresh-rate-sheet';
import { LanguageSheet } from '@/components/settings/language-sheet';
import { ModeSwitchCountdown } from '@/components/settings/mode-switch-countdown';
import { ToastAction } from '@/components/ui/toast';
import { useSettingsStore } from '@/stores/settings-store';
import { DEFAULT_NETWORKS } from '@/lib/networks';
import { useSidePanelMode } from '@/hooks/use-side-panel-mode';
import { useToast } from '@/hooks/use-toast';

type DisplayMode = 'popup' | 'sidepanel';

const getLanguageLabel = (language: string): string => {
  const languageMap: Record<string, string> = {
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    en: 'English',
  };
  const lang = language.split('-')[0];
  return languageMap[lang] || 'English';
};

const getAutoLockLabel = (
  value: number,
  t: (key: string) => string,
): string => {
  const labels: Record<number, string> = {
    0: t('settings.security_sheet.options.window_close'),
    5: t('settings.security_sheet.options.5_min'),
    15: t('settings.security_sheet.options.15_min'),
    30: t('settings.security_sheet.options.30_min'),
    60: t('settings.security_sheet.options.1_hour'),
    [-1]: t('settings.security_sheet.options.never'),
  };
  return labels[value] ?? `${value} min`;
};

const getRefreshRateLabel = (
  value: number,
  t: (key: string) => string,
): string => {
  const labels: Record<number, string> = {
    1: t('settings.refresh_sheet.options.1_min'),
    2: t('settings.refresh_sheet.options.2_min'),
    5: t('settings.refresh_sheet.options.5_min'),
    10: t('settings.refresh_sheet.options.10_min'),
    30: t('settings.refresh_sheet.options.30_min'),
    [-1]: t('settings.refresh_sheet.options.manual'),
  };
  return labels[value] ?? `${value} min`;
};

const PreLoginSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { networkId, autoLockTimeout, balancePollInterval } = useSettingsStore();
  const { uiMode, updateMode } = useSidePanelMode();

  const [isNetworkOpen, setIsNetworkOpen] = React.useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = React.useState(false);
  const [isRefreshRateOpen, setIsRefreshRateOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);

  const networkName =
    DEFAULT_NETWORKS[networkId]?.name || DEFAULT_NETWORKS.mainnet.name;

  const handleModeChange = (newMode: DisplayMode) => {
    toast({
      className: 'flex-col items-start space-x-0 gap-2',
      title: t('settings.display_mode_sheet.title'),
      description: (
        <ModeSwitchCountdown
          seconds={5}
          targetMode={newMode}
          onComplete={() => updateMode(newMode)}
        />
      ),
      action: (
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3"
            onClick={() => {
              updateMode(newMode);
            }}
          >
            {t('settings.display_mode_sheet.switch_now')}
          </Button>
          <ToastAction altText={t('settings.display_mode_sheet.cancel_change')}>
            {t('settings.display_mode_sheet.cancel_change')}
          </ToastAction>
        </div>
      ),
      duration: 6000,
    });
  };

  return (
    <div className="flex h-full flex-col space-y-6 py-2 pb-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          title={t('common.back', 'Back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-display text-white">
            {t('settings.title', 'Settings')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'settings.prelogin_desc',
              'Adjust app preferences before unlocking your wallet.',
            )}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <SettingsSection title={t('settings.general', 'General')}>
          <SettingsItem
            icon={Globe}
            label={t('settings.network')}
            value={networkName}
            onClick={() => setIsNetworkOpen(true)}
          />
          <SettingsItem
            icon={Languages}
            label={t('settings.language', 'Language')}
            value={getLanguageLabel(i18n.language)}
            onClick={() => setIsLanguageOpen(true)}
          />
          <SettingsItem
            icon={Layout}
            label={t('settings.display_mode')}
            value={
              uiMode === 'sidepanel'
                ? t('settings.display_mode_sheet.sidepanel')
                : t('settings.display_mode_sheet.popup')
            }
            onClick={() =>
              handleModeChange(uiMode === 'sidepanel' ? 'popup' : 'sidepanel')
            }
          />
          <SettingsItem
            icon={RefreshCw}
            label={t('settings.refresh_sheet.title')}
            value={getRefreshRateLabel(balancePollInterval, t)}
            onClick={() => setIsRefreshRateOpen(true)}
          />
          <SettingsItem
            icon={ShieldCheck}
            label={t('settings.security')}
            value={getAutoLockLabel(autoLockTimeout, t)}
            onClick={() => setIsSecurityOpen(true)}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.about', 'About')}>
          <SettingsItem
            icon={BookOpen}
            label={t('settings.faq', 'FAQ')}
            rightIcon={ExternalLink}
            onClick={() => {
              window.open('https://docs.minaprotocol.com', '_blank');
            }}
          />
        </SettingsSection>
      </div>

      <NetworkSheet open={isNetworkOpen} onOpenChange={setIsNetworkOpen} />
      <SecuritySheet open={isSecurityOpen} onOpenChange={setIsSecurityOpen} />
      <RefreshRateSheet
        open={isRefreshRateOpen}
        onOpenChange={setIsRefreshRateOpen}
      />
      <LanguageSheet open={isLanguageOpen} onOpenChange={setIsLanguageOpen} />
    </div>
  );
};

export default PreLoginSettingsPage;
