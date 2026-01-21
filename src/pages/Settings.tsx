import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Globe,
  ShieldCheck,
  Layers,
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
import {
  SecuritySheet,
} from '@/components/settings/security-sheet';
import {
  RefreshRateSheet,
} from '@/components/settings/refresh-rate-sheet';
import { ResetWalletDialog } from '@/components/settings/reset-wallet-dialog';
import { ViewPrivateKeySheet } from '@/components/wallet/view-private-key-sheet';
import { LanguageSheet } from '@/components/settings/language-sheet';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { publicKey } = useWalletStore();
  const { networkId, autoLockTimeout, balancePollInterval } =
    useSettingsStore();
  const { networks } = useNetworkStore();
  const { uiMode, updateMode } = useSidePanelMode();
  const { toast } = useToast();

  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = React.useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = React.useState(false);
  const [isRefreshRateOpen, setIsRefreshRateOpen] = React.useState(false);
  const [isViewKeyOpen, setIsViewKeyOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);

  const currentNetwork = networks[networkId] || DEFAULT_NETWORKS.mainnet;

  const getAutoLockLabel = (value: number) => {
    switch(value) {
      case 0: return t('settings.security_sheet.options.window_close');
      case 5: return t('settings.security_sheet.options.5_min');
      case 15: return t('settings.security_sheet.options.15_min');
      case 30: return t('settings.security_sheet.options.30_min');
      case 60: return t('settings.security_sheet.options.1_hour');
      case -1: return t('settings.security_sheet.options.never');
      default: return `${value} min`;
    }
  };

  const getRefreshRateLabel = (value: number) => {
    switch(value) {
      case 1: return t('settings.refresh_sheet.options.1_min');
      case 2: return t('settings.refresh_sheet.options.2_min');
      case 5: return t('settings.refresh_sheet.options.5_min');
      case 10: return t('settings.refresh_sheet.options.10_min');
      case 30: return t('settings.refresh_sheet.options.30_min');
      case -1: return t('settings.refresh_sheet.options.manual');
      default: return `${value} min`;
    }
  };

  const currentAutoLockLabel = getAutoLockLabel(autoLockTimeout);
  const currentRefreshRateLabel = getRefreshRateLabel(balancePollInterval);

  // Placeholder for account name - in a real app this might come from a store
  const accountName = 'Personal Wallet 2';

  // Placeholder for connected apps count
  const connectedAppsCount = 3;

  const currentLanguageLabel = (() => {
    if (i18n.language.startsWith('es')) return 'Español';
    if (i18n.language.startsWith('fr')) return 'Français';
    if (i18n.language.startsWith('de')) return 'Deutsch';
    return 'English';
  })();

  const handleModeChange = (newMode: 'popup' | 'sidepanel') => {
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
          <ToastAction altText={t('settings.display_mode_sheet.cancel_change')}>{t('settings.display_mode_sheet.cancel_change')}</ToastAction>
        </div>
      ),
      duration: 6000,
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-4 py-2">
      <div className="space-y-6 flex-1">
        <SettingsSection title={t('settings.current_account')}>
          <div className="p-4 space-y-4">
            <div
              className="bg-background/50 border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate('/dashboard')}
            >
              <div>
                <div className="font-semibold">{accountName}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {publicKey ? formatAddress(publicKey) : 'No Wallet'}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                // Manage logic
              }}
            >
              {t('settings.manage')}
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title={t('settings.title')}>
          <SettingsItem
            icon={Languages}
            label={t('settings.language_title', 'Language')}
            value={currentLanguageLabel}
            onClick={() => setIsLanguageOpen(true)}
          />
          <SettingsItem
            icon={Layout}
            label={t('settings.display_mode')}
            value={uiMode === 'sidepanel' ? t('settings.display_mode_sheet.sidepanel') : t('settings.display_mode_sheet.popup')}
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
            value={currentAutoLockLabel}
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
            value={currentRefreshRateLabel}
            onClick={() => setIsRefreshRateOpen(true)}
          />
          <SettingsItem
            icon={Layers}
            label={t('settings.connected_apps')}
            value={connectedAppsCount}
            onClick={() => {
              // Open connected apps
            }}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.advanced')}>
          <SettingsItem
            icon={Trash2}
            label={t('settings.reset_wallet')}
            showArrow={false}
            onClick={() => setIsResetDialogOpen(true)}
          />
        </SettingsSection>

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
      </div>

      <ResetWalletDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
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
    </div>
  );
};

export default SettingsPage;
