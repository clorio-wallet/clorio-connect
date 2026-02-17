import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Globe,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Layout,
  Trash2,
  RefreshCw,
  Key,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useNetworkStore } from '@/stores/network-store';
import { formatAddress } from '@/lib/utils';
import { DEFAULT_NETWORKS } from '@/lib/networks';
import { useSidePanelMode } from '@/hooks/use-side-panel-mode';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ModeSwitchCountdown } from '@/components/settings/mode-switch-countdown';
import { SettingsSection } from '@/components/settings/settings-section';
import { SettingsItem } from '@/components/settings/settings-item';
import { NetworkSheet } from '@/components/settings/network-sheet';
import { SecuritySheet } from '@/components/settings/security-sheet';
import { RefreshRateSheet } from '@/components/settings/refresh-rate-sheet';
import { ResetWalletDialog } from '@/components/settings/reset-wallet-dialog';
import { ViewPrivateKeySheet } from '@/components/wallet/view-private-key-sheet';
import { LanguageSheet } from '@/components/settings/language-sheet';
import { AppHeader } from '@/components/dashboard/dashboard-header';

type DisplayMode = 'popup' | 'sidepanel';

const isPlaygroundEnabled =
  import.meta.env.DEV === true ||
  import.meta.env.VITE_DEV === 'true';

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

const getAutoLockLabel = (value: number, t: (key: string) => string): string => {
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

const getRefreshRateLabel = (value: number, t: (key: string) => string): string => {
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

const CurrentAccountSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicKey } = useWalletStore();
  const formattedAddress = publicKey ? formatAddress(publicKey) : 'No Wallet';

  return (
    <SettingsSection title={t('settings.current_account')}>
      <div className="p-4 space-y-4">
        <div
          className="bg-background/50 border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          <div>
            <div className="font-semibold">Personal Wallet 2</div>
            <div className="text-xs text-muted-foreground font-mono">
              {formattedAddress}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => navigate('/dashboard')}
        >
          {t('settings.manage')}
        </Button>
      </div>
    </SettingsSection>
  );
};

const GeneralSettingsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { networkId, autoLockTimeout, balancePollInterval } =
    useSettingsStore();
  const { networks } = useNetworkStore();
  const { uiMode, updateMode } = useSidePanelMode();
  const { toast } = useToast();
  const [isNetworkOpen, setIsNetworkOpen] = React.useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = React.useState(false);
  const [isRefreshRateOpen, setIsRefreshRateOpen] = React.useState(false);
  const [isViewKeyOpen, setIsViewKeyOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);

  const currentNetwork = networks[networkId] || DEFAULT_NETWORKS.mainnet;

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
        <div className="flex items-center gap-2 w-full justify-end">
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
    <SettingsSection title={t('settings.title')}>
      <SettingsItem
        icon={Languages}
        label={t('settings.language_title', 'Language')}
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
        icon={Globe}
        label={t('settings.network')}
        value={currentNetwork.name}
        onClick={() => setIsNetworkOpen(true)}
      />
      <SettingsItem
        icon={ShieldCheck}
        label={t('settings.security')}
        value={getAutoLockLabel(autoLockTimeout, t)}
        onClick={() => setIsSecurityOpen(true)}
      />
      <SettingsItem
        icon={Key}
        label={t('settings.view_private_key')}
        onClick={() => setIsViewKeyOpen(true)}
      />
      <SettingsItem
        icon={RefreshCw}
        label={t('settings.balance_refresh')}
        value={getRefreshRateLabel(balancePollInterval, t)}
        onClick={() => setIsRefreshRateOpen(true)}
      />
      <NetworkSheet open={isNetworkOpen} onOpenChange={setIsNetworkOpen} />
      <SecuritySheet open={isSecurityOpen} onOpenChange={setIsSecurityOpen} />
      <RefreshRateSheet
        open={isRefreshRateOpen}
        onOpenChange={setIsRefreshRateOpen}
      />
      <ViewPrivateKeySheet
        open={isViewKeyOpen}
        onOpenChange={setIsViewKeyOpen}
      />
      <LanguageSheet open={isLanguageOpen} onOpenChange={setIsLanguageOpen} />
    </SettingsSection>
  );
};

const AboutSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('settings.about')}>
      <SettingsItem
        icon={BookOpen}
        label={t('settings.faq')}
        rightIcon={ExternalLink}
        onClick={() => {
          window.open('https://docs.minaprotocol.com', '_blank');
        }}
      />
    </SettingsSection>
  );
};

const AdvancedSettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);

  return (
    <SettingsSection title={t('settings.advanced')}>
      {isPlaygroundEnabled && (
        <SettingsItem
          icon={Layout}
          label="Playground"
          onClick={() => navigate('/playground')}
        />
      )}
      <SettingsItem
        variant="danger"
        icon={() => <Trash2 className="stroke-red-500" />}
        label={t('settings.reset_wallet')}
        showArrow={false}
        onClick={() => setIsResetDialogOpen(true)}
      />
      <ResetWalletDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
      />
    </SettingsSection>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-6 pb-4 py-2">
      <AppHeader />
      <div className="space-y-6 flex-1">
        <CurrentAccountSection />
        <GeneralSettingsSection />
        <AboutSection />
        <AdvancedSettingsSection />
      </div>
    </div>
  );
};

export default SettingsPage;
