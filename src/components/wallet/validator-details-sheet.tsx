import React from 'react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/components/ui/bottom-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAddress, formatBalance } from '@/lib/utils';
import { CheckCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';

export interface ValidatorDetails {
  publicKey: string;
  name?: string;
  stake: number;
  fee: number;
  imgurl?: string;
  websiteUrl?: string;
  explorerUrl?: string;
}

interface ValidatorDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validator: ValidatorDetails | null;
  isDelegated?: boolean;
  onDelegate?: () => void;
}

export const ValidatorDetailsSheet: React.FC<ValidatorDetailsSheetProps> = ({
  open,
  onOpenChange,
  validator,
  isDelegated = false,
  onDelegate,
}) => {
  const { t } = useTranslation();

  // hooks must be invoked unconditionally
  const networkId = useSettingsStore((s) => {
    return s.networkId;
  });

  const explorerUrls = React.useMemo(() => {
    if (!validator) return { minascan: '', minaExplorer: '' };

    const { publicKey } = validator;
    const isMainnet = networkId === 'mainnet';

    const minascanBase = isMainnet
      ? 'https://minascan.io/mainnet'
      : 'https://minascan.io/devnet';

    const minaExplorerBase = isMainnet
      ? 'https://minaexplorer.com'
      : 'https://devnet.minaexplorer.com';

    return {
      minascan: `${minascanBase}/validator/${publicKey}/delegations`,
      minaExplorer: `${minaExplorerBase}/wallet/${publicKey}`,
    };
  }, [networkId, validator]);

  if (!validator) return null;

  const { publicKey, name, stake, fee, imgurl, websiteUrl } = validator;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="border-none mt-10">
        <BottomSheetHeader className="text-center">
          <BottomSheetTitle className="text-3xl font-display font-normal">
            {t('validators.details.stake_title')}
          </BottomSheetTitle>
        </BottomSheetHeader>

        <div className="flex flex-col items-center pt-4 px-4 pb-6 space-y-6">
          <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
            {imgurl ? (
              <img
                src={imgurl}
                alt={name || publicKey}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-zinc-800" />
            )}
          </div>

          <div className="w-full rounded-xl bg-card/30 border border-border/40 overflow-hidden">
            <div className="p-4 text-center space-y-2 border-b border-border/40">
              <h2 className="text-xl font-semibold text-foreground">
                {name || formatAddress(publicKey)}
              </h2>
              {isDelegated && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-[10px] h-5 mx-auto w-fit"
                >
                  <CheckCircle className="w-3 h-3" />
                  {t('validators.details.delegated_label')}
                </Badge>
              )}
              <p className="text-[10px] text-muted-foreground break-all px-2 leading-relaxed font-mono">
                {publicKey}
              </p>
            </div>

            <div className="px-4 py-3 flex justify-between items-center border-b border-border/40 bg-card/10">
              <span className="text-sm font-medium text-muted-foreground">
                {t('validators.total_stake_label')}
              </span>
              <span className="text-sm font-medium text-foreground">
                {formatBalance(stake)} MINA
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center bg-card/10">
              <span className="text-sm font-medium text-muted-foreground">
                {t('validators.fee_label')}
              </span>
              <span className="text-sm font-medium text-foreground">
                {fee}%
              </span>
            </div>
          </div>

          <div className="w-full flex gap-3">
            {websiteUrl && (
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-border/40 h-11"
                onClick={() => window.open(websiteUrl || '', '_blank')}
                disabled={!websiteUrl}
              >
                {t('validators.details.website_button')}
              </Button>
            )}

            <div className="flex-1 flex gap-2 min-w-0">
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-border/40 h-11 min-w-0 px-2 gap-2"
                onClick={() => window.open(explorerUrls.minascan, '_blank')}
              >
                <span className="truncate">
                  {t('validators.details.explorer_button')}
                </span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-3 bg-transparent border-border/40 h-11 shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(explorerUrls.minaExplorer, '_blank')
                    }
                  >
                    MinaExplorer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-medium"
            onClick={onDelegate}
            disabled={isDelegated}
          >
            {isDelegated
              ? t('validators.delegated_badge')
              : t('validators.details.start_button')}
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
};
