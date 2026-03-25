import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
} from '@/components/ui/bottom-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGetTransaction } from '@/api/mina/transactions';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { formatBalance } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressDisplay } from './address-display';
import Lottie from 'lottie-react';
import checkmarkAnimation from '@/animations/checkmark.json';

interface TransactionDetailsSheetProps {
  hash: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransactionDetailsSheet: React.FC<
  TransactionDetailsSheetProps
> = ({ hash, open, onOpenChange }) => {
  const { t } = useTranslation();
  const { publicKey, network } = useDashboardData();
  const { data: transaction, isLoading } = useGetTransaction(hash, {
    enabled: open && !!hash,
  });

  const isIncoming = useMemo(() => {
    if (!transaction || !publicKey) return false;
    return transaction.receiver === publicKey;
  }, [transaction, publicKey]);

  const formattedDate = useMemo(() => {
    if (!transaction?.timestamp) return '';
    return new Date(transaction.timestamp).toLocaleString();
  }, [transaction]);

  const totalAmount = useMemo(() => {
    if (!transaction) return '0';
    const amount = Number(transaction.amount);
    const fee = Number(transaction.fee);
    return formatBalance(amount + fee);
  }, [transaction]);

  const explorerUrls = useMemo(() => {
    const env = import.meta.env as Record<string, string | undefined>;

    const isMainnet = network.label === 'mainnet';
    const minascanBaseEnv = isMainnet
      ? env.VITE_MINASCAN_MAINNET_BASE_URL
      : env.VITE_MINASCAN_DEVNET_BASE_URL;
    const minaExplorerBaseEnv = isMainnet
      ? env.VITE_MINAEXPLORER_MAINNET_BASE_URL
      : env.VITE_MINAEXPLORER_DEVNET_BASE_URL;

    const minascanBase =
      minascanBaseEnv ||
      (isMainnet
        ? 'https://minascan.io/mainnet'
        : 'https://minascan.io/devnet');
    const minaExplorerBase =
      minaExplorerBaseEnv ||
      (isMainnet
        ? 'https://minaexplorer.com'
        : 'https://devnet.minaexplorer.com');

    return {
      minascan: `${minascanBase}/tx/${hash}/txInfo`,
      minaExplorer: `${minaExplorerBase}/transaction/${hash}`,
    };
  }, [network.label, hash]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 p-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <div className="space-y-2 mt-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!transaction) return null;

    return (
      <div className="flex flex-col items-center px-4 pt-4 pb-5 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/40 via-primary/10 to-transparent opacity-80" />
            <div className="relative h-full w-full rounded-3xl bg-background flex items-center justify-center ">
              <Lottie
                animationData={checkmarkAnimation}
                loop={false}
                autoplay
                className="w-34 h-34"
              />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-center text-foreground">
            {isIncoming
              ? t('transaction_details.title_received')
              : t('transaction_details.title_sent')}
          </h2>
        </div>

        <div className="w-full space-y-3 bg-muted/30 rounded-2xl p-3 border border-border/50">
          <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm font-medium text-muted-foreground">
              {t('transaction_details.date')}
            </span>
            <span className="text-sm text-foreground">{formattedDate}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm font-medium text-muted-foreground">
              {isIncoming
                ? t('transaction_details.received')
                : t('transaction_details.sent')}
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatBalance(transaction.amount)} {transaction.symbol || 'MINA'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm font-medium text-muted-foreground">
              {isIncoming
                ? t('transaction_details.from')
                : t('transaction_details.to')}
            </span>
            <div className="flex justify-end">
              <AddressDisplay
                address={isIncoming ? transaction.sender : transaction.receiver}
                truncate={true}
                className="text-sm text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm font-medium text-muted-foreground">
              {t('transaction_details.fee')}
            </span>
            <span className="text-sm text-foreground">
              {formatBalance(transaction.fee)} MINA
            </span>
          </div>

          <div className="flex flex-col items-start gap-1 py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm font-medium text-muted-foreground">
              {t('transaction_details.memo')}
            </span>
            <span className="text-sm text-foreground break-all line-clamp-2 text-right">
              {transaction.memo || t('transaction_details.none')}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 pt-3 mt-1">
            <span className="text-sm font-semibold text-muted-foreground">
              {t('transaction_details.total')}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {totalAmount} MINA
            </span>
          </div>
        </div>

        <div className="w-full flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => window.open(explorerUrls.minascan, '_blank')}
          >
            {t('transaction_details.view_in_explorer')}
            <ExternalLink className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="px-3">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open(explorerUrls.minaExplorer, '_blank')}
              >
                MinaExplorer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="border-none mt-10">
        <div className="sr-only">
          <BottomSheetHeader>
            <BottomSheetTitle>
              {t('transaction_details.title_sent')}
            </BottomSheetTitle>
            <BottomSheetDescription>Transaction details</BottomSheetDescription>
          </BottomSheetHeader>
        </div>

        <div className="overflow-y-auto max-h-[75vh]">{renderContent()}</div>
      </BottomSheetContent>
    </BottomSheet>
  );
};
