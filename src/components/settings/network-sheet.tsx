import React from 'react';
import { Check, Plus } from 'lucide-react';
import { useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetClose,
} from '@/components/ui/bottom-sheet';

interface NetworkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NetworkSheet: React.FC<NetworkSheetProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { networks, addCustomNetwork } = useNetworkStore();
  const { networkId, setNetworkId } = useSettingsStore();
  const { toast } = useToast();
  const [isAddSheetOpen, setIsAddSheetOpen] = React.useState(false);
  const [customName, setCustomName] = React.useState('');
  const [customUrl, setCustomUrl] = React.useState('');
  const [customNetworkId, setCustomNetworkId] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const resetCustomForm = React.useCallback(() => {
    setCustomName('');
    setCustomUrl('');
    setCustomNetworkId('');
    setIsSaving(false);
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        resetCustomForm();
        setIsAddSheetOpen(false);
      }
    },
    [onOpenChange, resetCustomForm],
  );

  const handleAddCustomNetwork = React.useCallback(async () => {
    setIsSaving(true);

    try {
      const network = await addCustomNetwork({
        name: customName,
        url: customUrl,
        networkID: customNetworkId || undefined,
      });

      setNetworkId(network.label);
      toast({
        description: t('settings.network_sheet.custom_added', {
          defaultValue: '{{networkName}} added',
          networkName: network.name,
        }),
      });
      resetCustomForm();
      setIsAddSheetOpen(false);
      handleOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description:
          error instanceof Error ? error.message : 'Failed to add custom network',
      });
      setIsSaving(false);
    }
  }, [
    addCustomNetwork,
    customName,
    customNetworkId,
    customUrl,
    handleOpenChange,
    resetCustomForm,
    setNetworkId,
    t,
    toast,
  ]);

  const isAddDisabled =
    isSaving || customName.trim().length === 0 || customUrl.trim().length === 0;

  return (
    <>
      <BottomSheet open={open} onOpenChange={handleOpenChange}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{t('settings.network_sheet.title')}</BottomSheetTitle>
            <BottomSheetDescription>
              {t('settings.network_sheet.desc')}
            </BottomSheetDescription>
          </BottomSheetHeader>
          <BottomSheetBody className="space-y-6">
            <div className="space-y-2">
              {Object.values(networks).map((net) => (
                <div
                  key={net.label}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    networkId === net.label
                      ? 'bg-accent border-primary/50'
                      : 'hover:bg-accent/50 border-transparent',
                  )}
                  onClick={() => {
                    setNetworkId(net.label);
                    handleOpenChange(false);
                    toast({
                      description: t('settings.network_sheet.switched_toast', {
                        networkName: net.name,
                      }),
                    });
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{net.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {net.network}
                    </span>
                    {('apiUrl' in net && net.apiUrl) || ('epochUrl' in net && net.epochUrl) ? (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {('apiUrl' in net && net.apiUrl) || net.epochUrl}
                      </span>
                    ) : null}
                  </div>
                  {networkId === net.label && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </BottomSheetBody>
          <BottomSheetFooter className='flex flex-row '>
            <BottomSheetClose asChild>
              <Button variant="outline" className='w-full'>{t('common.cancel')}</Button>
            </BottomSheetClose>
            <Button variant="default" className='w-full' onClick={() => setIsAddSheetOpen(true)} >
              <Plus className="mr-2 h-4 w-4" />
              {t('settings.network_sheet.add_custom_action', 'Add endpoint')}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>
              {t('settings.network_sheet.add_custom_title', 'Add custom endpoint')}
            </BottomSheetTitle>
            <BottomSheetDescription>
              {t(
                'settings.network_sheet.add_custom_desc',
                'Save a REST endpoint as a custom network and switch to it immediately.',
              )}
            </BottomSheetDescription>
          </BottomSheetHeader>

          <BottomSheetBody className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="custom-network-name">
                {t('settings.network_sheet.custom_name', 'Network name')}
              </Label>
              <Input
                id="custom-network-name"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder={t(
                  'settings.network_sheet.custom_name_placeholder',
                  'Zeko Testnet',
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-network-url">
                {t('settings.network_sheet.custom_url', 'REST endpoint')}
              </Label>
              <Input
                id="custom-network-url"
                value={customUrl}
                onChange={(event) => setCustomUrl(event.target.value)}
                placeholder="https://.../v1"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-network-id">
                {t('settings.network_sheet.custom_id', 'Network ID (optional)')}
              </Label>
              <Input
                id="custom-network-id"
                value={customNetworkId}
                onChange={(event) => setCustomNetworkId(event.target.value)}
                placeholder="zeko:testnet"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </BottomSheetBody>

          <BottomSheetFooter className='flex flex-row'>
            <Button variant="outline" className='w-full' onClick={() => setIsAddSheetOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="default" className='w-full' onClick={handleAddCustomNetwork} disabled={isAddDisabled}>
              {t('settings.network_sheet.add_custom_action', 'Add')}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
};
