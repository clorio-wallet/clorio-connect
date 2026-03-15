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
  Plus,
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
import { WalletList } from '@/components/wallet/wallet-list';
import { AddWalletDialog } from '@/components/wallet/add-wallet-dialog';
import { AccountSelectorSheet } from '@/components/settings/account-selector-sheet';
import { VaultManager } from '@/lib/vault-manager';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DisplayMode = 'popup' | 'sidepanel';

const isPlaygroundEnabled =
  import.meta.env.DEV === true || import.meta.env.VITE_DEV === 'true';

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

const WalletsSection: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { wallets, activeWalletId, setActiveWallet, loadWallets } =
    useWalletStore();
  const [isAddWalletOpen, setIsAddWalletOpen] = React.useState(false);
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isViewSecretOpen, setIsViewSecretOpen] = React.useState(false);
  const [selectedWalletId, setSelectedWalletId] = React.useState<string | null>(
    null,
  );
  const [newWalletName, setNewWalletName] = React.useState('');

  React.useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const handleWalletSelect = async (walletId: string) => {
    try {
      await setActiveWallet(walletId);
      toast({
        title: t('wallets.switch_success', 'Wallet switched'),
        description: t('wallets.switch_success_desc', 'Wallet is now active'),
      });
    } catch (error) {
      console.error('Failed to switch wallet:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.switch_failed', 'Failed to switch wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleRename = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId);
    if (wallet) {
      setSelectedWalletId(walletId);
      setNewWalletName(wallet.name);
      setIsRenameOpen(true);
    }
  };

  const handleRenameConfirm = async () => {
    if (!selectedWalletId || !newWalletName.trim()) return;

    try {
      await VaultManager.updateWalletName(
        selectedWalletId,
        newWalletName.trim(),
      );
      await loadWallets();
      toast({
        title: t('wallets.rename_success', 'Wallet renamed'),
        description: t('wallets.rename_success_desc', 'Wallet name updated'),
      });
      setIsRenameOpen(false);
      setSelectedWalletId(null);
      setNewWalletName('');
    } catch (error) {
      console.error('Failed to rename wallet:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.rename_failed', 'Failed to rename wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleDelete = (walletId: string) => {
    setSelectedWalletId(walletId);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWalletId) return;

    try {
      await VaultManager.removeWallet(selectedWalletId);
      await loadWallets();
      toast({
        title: t('wallets.delete_success', 'Wallet deleted'),
        description: t(
          'wallets.delete_success_desc',
          'Wallet has been removed',
        ),
      });
      setIsDeleteOpen(false);
      setSelectedWalletId(null);
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      toast({
        variant: 'destructive',
        title: t('wallets.errors.delete_failed', 'Failed to delete wallet'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleViewSecret = (walletId: string) => {
    setSelectedWalletId(walletId);
    setIsViewSecretOpen(true);
  };

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  return (
    <>
      <SettingsSection title={t('wallets.title', 'Wallets')}>
        <div className="p-4 space-y-4">
          <WalletList
            wallets={wallets}
            activeWalletId={activeWalletId || ''}
            onWalletSelect={handleWalletSelect}
            onWalletRename={handleRename}
            onWalletDelete={handleDelete}
            onViewSecret={handleViewSecret}
          />
          <Button
            className="w-full"
            variant="default"
            onClick={() => setIsAddWalletOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('wallets.add_wallet', 'Add Wallet')}
          </Button>
        </div>
      </SettingsSection>

      <AddWalletDialog
        open={isAddWalletOpen}
        onOpenChange={setIsAddWalletOpen}
      />

      {/* Rename Dialog */}
      <AlertDialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('wallets.rename_wallet', 'Rename Wallet')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'wallets.rename_wallet_desc',
                'Enter a new name for this wallet',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="wallet-name">
              {t('wallets.wallet_name', 'Wallet Name')}
            </Label>
            <Input
              id="wallet-name"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              placeholder={t('wallets.wallet_name_placeholder', 'My Wallet')}
              maxLength={50}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsRenameOpen(false);
                setSelectedWalletId(null);
                setNewWalletName('');
              }}
            >
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameConfirm}>
              {t('common.confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('wallets.delete_wallet', 'Delete Wallet')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'wallets.delete_wallet_desc',
                'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
                { name: selectedWallet?.name },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedWalletId(null);
              }}
            >
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('wallets.delete_wallet', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Secret Sheet */}
      {selectedWalletId && (
        <ViewPrivateKeySheet
          open={isViewSecretOpen}
          onOpenChange={setIsViewSecretOpen}
        />
      )}
    </>
  );
};

const CurrentAccountSection: React.FC = () => {
  const { t } = useTranslation();
  const { publicKey, accountName, wallets } = useWalletStore();
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] =
    React.useState(false);
  const formattedAddress = publicKey ? formatAddress(publicKey) : 'No Wallet';
  const walletCount = wallets.length;

  return (
    <>
      <SettingsSection title={t('settings.current_account')}>
        <div className="p-4 space-y-4">
          <div
            className="bg-background/50 border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setIsAccountSelectorOpen(true)}
          >
            <div>
              <div className="font-semibold">{accountName || 'Wallet'}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {formattedAddress}
              </div>
              {walletCount > 1 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {t('wallets.total_wallets', '{{count}} wallet(s) in total', {
                    count: walletCount,
                  })}
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {walletCount > 1 && (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setIsAccountSelectorOpen(true)}
            >
              {t('settings.switch_account', 'Switch Account')}
            </Button>
          )}
        </div>
      </SettingsSection>

      <AccountSelectorSheet
        open={isAccountSelectorOpen}
        onOpenChange={setIsAccountSelectorOpen}
      />
    </>
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
