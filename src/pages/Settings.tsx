import React from 'react';
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
  AUTO_LOCK_OPTIONS,
} from '@/components/settings/security-sheet';
import {
  RefreshRateSheet,
  REFRESH_RATE_OPTIONS,
} from '@/components/settings/refresh-rate-sheet';
import { ResetWalletDialog } from '@/components/settings/reset-wallet-dialog';

const SettingsPage: React.FC = () => {
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

  const currentNetwork = networks[networkId] || DEFAULT_NETWORKS.mainnet;
  const currentAutoLockLabel =
    AUTO_LOCK_OPTIONS.find((o) => o.value === autoLockTimeout)?.label ||
    `${autoLockTimeout} min`;
  const currentRefreshRateLabel =
    REFRESH_RATE_OPTIONS.find((o) => o.value === balancePollInterval)?.label ||
    `${balancePollInterval} min`;

  // Placeholder for account name - in a real app this might come from a store
  const accountName = 'Personal Wallet 2';

  // Placeholder for connected apps count
  const connectedAppsCount = 3;

  const handleModeChange = (newMode: 'popup' | 'sidepanel') => {
    toast({
      className: 'flex-col items-start space-x-0 gap-2',
      title: 'Changing Display Mode',
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
            Switch Now
          </Button>
          <ToastAction altText="Cancel change">Cancel</ToastAction>
        </div>
      ),
      duration: 6000,
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-4 py-2">
      <div className="space-y-6 flex-1">
        <SettingsSection title="Current account">
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
              Manage
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Settings">
          <SettingsItem
            icon={Layout}
            label="Display Mode"
            value={uiMode === 'sidepanel' ? 'Side Panel' : 'Popup'}
            onClick={() =>
              handleModeChange(uiMode === 'sidepanel' ? 'popup' : 'sidepanel')
            }
          />
          <SettingsItem
            icon={Globe}
            label="Network"
            value={currentNetwork.name}
            onClick={() => setIsNetworkOpen(true)}
          />
          <SettingsItem
            icon={ShieldCheck}
            label="Security"
            value={currentAutoLockLabel}
            onClick={() => setIsSecurityOpen(true)}
          />
          <SettingsItem
            icon={RefreshCw}
            label="Balance Refresh"
            value={currentRefreshRateLabel}
            onClick={() => setIsRefreshRateOpen(true)}
          />
          <SettingsItem
            icon={Layers}
            label="Connected zkApps"
            value={connectedAppsCount}
            onClick={() => {
              // Open connected apps
            }}
          />
        </SettingsSection>

        <SettingsSection title="Advanced">
          <SettingsItem
            icon={Trash2}
            label="Reset Wallet"
            showArrow={false}
            onClick={() => setIsResetDialogOpen(true)}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsItem
            icon={BookOpen}
            label="FAQ"
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
    </div>
  );
};

export default SettingsPage;
