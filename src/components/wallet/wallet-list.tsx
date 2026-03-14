import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  HardDrive,
  Clock,
} from 'lucide-react';
import type { WalletEntry } from '@/lib/types/vault';
import { formatAddress } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface WalletListProps {
  wallets: WalletEntry[];
  activeWalletId: string;
  onWalletSelect?: (walletId: string) => void;
  onWalletRename?: (walletId: string) => void;
  onWalletDelete?: (walletId: string) => void;
  onViewSecret?: (walletId: string) => void;
  showBalances?: boolean;
  className?: string;
}

const WalletTypeIcon: React.FC<{ type: WalletEntry['type'] }> = ({ type }) => {
  switch (type) {
    case 'ledger':
      return <HardDrive className="w-4 h-4" />;
    case 'mnemonic':
      return <Key className="w-4 h-4" />;
    case 'privateKey':
      return <Key className="w-4 h-4" />;
    default:
      return <Key className="w-4 h-4" />;
  }
};

const WalletTypeBadge: React.FC<{ type: WalletEntry['type'] }> = ({ type }) => {
  const { t } = useTranslation();

  const typeLabels: Record<WalletEntry['type'], string> = {
    mnemonic: t('wallets.wallet_types.mnemonic', 'Mnemonic'),
    privateKey: t('wallets.wallet_types.privateKey', 'Private Key'),
    ledger: t('wallets.wallet_types.ledger', 'Ledger'),
    seed: t('wallets.wallet_types.seed', 'Seed'),
  };

  const typeColors: Record<WalletEntry['type'], string> = {
    mnemonic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    privateKey: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    ledger: 'bg-green-500/10 text-green-500 border-green-500/20',
    seed: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };

  return (
    <Badge variant="outline" className={typeColors[type]}>
      <WalletTypeIcon type={type} />
      <span className="ml-1">{typeLabels[type]}</span>
    </Badge>
  );
};

export const WalletList: React.FC<WalletListProps> = ({
  wallets,
  activeWalletId,
  onWalletSelect,
  onWalletRename,
  onWalletDelete,
  onViewSecret,
  showBalances = false,
  className = '',
}) => {
  const { t } = useTranslation();

  const handleSelect = (walletId: string) => {
    if (walletId !== activeWalletId && onWalletSelect) {
      onWalletSelect(walletId);
    }
  };

  const handleRename = (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onWalletRename?.(walletId);
  };

  const handleDelete = (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onWalletDelete?.(walletId);
  };

  const handleViewSecret = (walletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onViewSecret?.(walletId);
  };

  if (wallets.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          {t('wallets.no_wallets', 'No wallets found')}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {wallets.map((wallet) => {
        const isActive = wallet.id === activeWalletId;
        const canDelete = wallets.length > 1;

        return (
          <Card
            key={wallet.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isActive ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => handleSelect(wallet.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-base truncate">
                      {wallet.name}
                    </CardTitle>
                    {isActive && (
                      <Badge
                        variant="default"
                        className="shrink-0 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {t('wallets.active_wallet', 'Active')}
                      </Badge>
                    )}
                  </div>
                  <WalletTypeBadge type={wallet.type} />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isActive && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleSelect(wallet.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {t('wallets.set_active', 'Set as Active')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={(e) => handleRename(wallet.id, e)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t('wallets.rename_wallet', 'Rename')}
                    </DropdownMenuItem>
                    {wallet.type !== 'ledger' && (
                      <DropdownMenuItem
                        onClick={(e) => handleViewSecret(wallet.id, e)}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        {t('wallets.view_secret', 'View Secret')}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(wallet.id, e)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('wallets.delete_wallet', 'Delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Public Key */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {t('wallets.public_key', 'Public Key')}
                </p>
                <p className="font-mono text-sm break-all">
                  {formatAddress(wallet.publicKey)}
                </p>
              </div>

              {/* Derivation Info (if applicable) */}
              {wallet.derivationPath && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">
                      {t('wallets.derivation_path', 'Path')}:
                    </span>{' '}
                    <span className="font-mono">{wallet.derivationPath}</span>
                  </div>
                  {wallet.accountIndex !== undefined && (
                    <div>
                      <span className="font-medium">
                        {t('wallets.account_index', 'Index')}:
                      </span>{' '}
                      {wallet.accountIndex}
                    </div>
                  )}
                </div>
              )}

              {/* Last Used */}
              {wallet.lastUsed && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {t('wallets.last_used', 'Last used')}:{' '}
                    {new Date(wallet.lastUsed).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Balance (optional) */}
              {showBalances && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t('wallets.balance_loading', 'Balance loading...')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WalletList;
