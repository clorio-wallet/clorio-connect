import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  Repeat,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui';
import { AddressDisplay } from './address-display';
import { BalanceDisplay } from './balance-display';
import { useWalletStore } from '@/stores/wallet-store';
import { useToast } from '@/hooks/use-toast';

interface AccountCardProps {
  account: {
    id: string; // wallet ID
    name: string;
    address: string;
    balance: string;
    symbol: string;
    fiatValue?: string;
  };
  isActive?: boolean;
  isLoading?: boolean;
  explorerUrl?: string;
  onSelect?: () => void;
  onViewPrivateKey?: () => void;
  onSwitchWallet?: () => void;
  onRefreshBalance?: () => void;
  className?: string;
}

export function AccountCard({
  account,
  isActive = false,
  isLoading = false,
  explorerUrl,
  onSelect,
  onViewPrivateKey,
  onSwitchWallet,
  onRefreshBalance,
  className,
}: AccountCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { wallets, updateWalletName, removeWallet } = useWalletStore();

  const [copied, setCopied] = React.useState(false);
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [newName, setNewName] = React.useState(account.name);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canDelete = wallets.length > 1;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNewName(account.name);
    setIsRenameOpen(true);
  };

  const handleRenameConfirm = async () => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.invalid_name',
          'Wallet name cannot be empty',
        ),
      });
      return;
    }

    if (trimmedName.length > 50) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.name_too_long',
          'Wallet name too long (max 50 characters)',
        ),
      });
      return;
    }

    if (trimmedName === account.name) {
      setIsRenameOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      await updateWalletName(account.id, trimmedName);

      toast({
        variant: 'success',
        title: t('wallets.rename_success', 'Wallet renamed'),
        description: t(
          'wallets.rename_success_desc',
          `Renamed to "${trimmedName}"`,
        ),
      });

      setIsRenameOpen(false);
    } catch (error) {
      console.error('Failed to rename wallet:', error);
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.rename_failed',
          'Failed to rename wallet',
        ),
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!canDelete) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.cannot_delete_last',
          'Cannot delete the last wallet',
        ),
      });
      return;
    }

    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!canDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await removeWallet(account.id);

      toast({
        variant: 'success',
        title: t('wallets.delete_success', 'Wallet deleted'),
        description: t(
          'wallets.delete_success_desc',
          `"${account.name}" has been removed`,
        ),
      });

      setIsDeleteOpen(false);
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'wallets.errors.delete_failed',
          'Failed to delete wallet',
        ),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        whileTap={{ scale: 0.99 }}
        transition={{
          layout: {
            duration: 0.3,
            type: 'spring',
            stiffness: 300,
            damping: 30,
          },
          default: { duration: 0.15 },
        }}
      >
        <Card
          className={cn(
            'relative cursor-pointer transition-all',
            isActive
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'hover:border-primary/50',
            className,
          )}
          onClick={onSelect}
        >
          {/* Active Indicator */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
          )}

          <div className="p-4">
            <div className="flex items-start justify-between">
              {/* Account Info */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg truncate">{account.name}</h3>
                  {isActive && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {t('settings.account_card.active', 'Active')}
                    </span>
                  )}
                  {onSwitchWallet && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwitchWallet();
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Repeat className="h-3 w-3" />
                      <span className="hidden sm:block">
                        {t('wallets.switch_wallet', 'Switch Wallet')}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <AddressDisplay
                    address={account.address}
                    showCopy={false}
                    showExplorer={!!explorerUrl}
                    explorerUrl={explorerUrl}
                    className="text-muted-foreground"
                    truncateStart={10}
                    truncateEnd={10}
                  />
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRefreshBalance && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefreshBalance();
                      }}
                      disabled={isLoading}
                    >
                      <RefreshCcw
                        className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                      />
                      {t('dashboard.refresh_balance', 'Refresh balance')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleRenameClick}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('settings.account_card.rename', 'Rename')}
                  </DropdownMenuItem>
                  {onViewPrivateKey && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPrivateKey();
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t(
                        'settings.account_card.view_private_key',
                        'View Private Key',
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    disabled={!canDelete}
                    className="text-destructive focus:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('settings.account_card.remove', 'Remove')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Balance */}
            <div className="mt-3">
              <BalanceDisplay
                balance={account.balance}
                symbol={account.symbol}
                showFiat
                fiatValue={account.fiatValue}
                size="sm"
                loading={isLoading}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {t('wallets.rename_wallet', 'Rename Wallet')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'wallets.rename_wallet_desc',
                'Enter a new name for this wallet',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wallet-name">
                {t('wallets.wallet_name', 'Wallet Name')}
              </Label>
              <Input
                id="wallet-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('wallets.wallet_name_placeholder', 'My Wallet')}
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRenaming) {
                    handleRenameConfirm();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {newName.length}/50 {t('common.characters', 'characters')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              disabled={isRenaming}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={isRenaming || !newName.trim()}
            >
              {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('wallets.confirm_delete.title', 'Delete Wallet?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'wallets.confirm_delete.description',
                'Are you sure you want to delete "{{name}}"? This action cannot be undone. Make sure you have backed up your recovery phrase or private key.',
                { name: account.name },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('wallets.confirm_delete.confirm', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
