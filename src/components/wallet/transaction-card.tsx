import * as React from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  RefreshCw,
  ShieldCheck,
  Download,
  Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBalance, cn, formatTimestamp } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TruncatedMiddle } from '../ui/truncated-middle';

export type TransactionCardStatus = 'pending' | 'applied' | 'failed';
export type TransactionType = 'payment' | 'delegation' | 'zkapp';

interface TransactionCardProps {
  type: TransactionType;
  status: TransactionCardStatus;
  amount: number;
  fee: number;
  hash: string;
  timestamp: string;
  sender: string;
  receiver: string;
  isIncoming: boolean;
  symbol?: string;
  onClick?: () => void;
}

const StatusConfig = {
  pending: {
    icon: Clock,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badgeClass:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  applied: {
    icon: CheckCircle,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badgeClass:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
    badgeClass:
      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
};

const TransactionTypeIcon = {
  payment: {
    incoming: Download,
    outgoing: Upload,
    incomingClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    outgoingClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  delegation: {
    incoming: Users,
    outgoing: RefreshCw,
    incomingClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    outgoingClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  zkapp: {
    incoming: ShieldCheck,
    outgoing: ShieldCheck,
    incomingClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    outgoingClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
};

export function TransactionCard({
  type,
  status,
  amount,
  timestamp,
  isIncoming,
  symbol = 'MINA',
  onClick,
  sender,
  receiver,
}: TransactionCardProps) {
  const { t } = useTranslation();
  const numericTimestamp = Number(timestamp);
  const fullDateTime =
    numericTimestamp > 0
      ? new Date(numericTimestamp * 1000).toLocaleString()
      : '';

  const addressToShow = () => {
    if (type === 'delegation') {
      return isIncoming ? sender : receiver;
    }
    return isIncoming ? receiver : sender;
  };

  const statusConfig = StatusConfig[status];
  const StatusIcon = statusConfig.icon;
  const typeIcon = TransactionTypeIcon[type] || TransactionTypeIcon.payment;
  const TypeIcon = isIncoming ? typeIcon.incoming : typeIcon.outgoing;
  const iconBgClass = isIncoming
    ? typeIcon.incomingClass
    : typeIcon.outgoingClass;

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer border-none shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={cn(
              'h-[40px] w-[50px] rounded-full flex items-center justify-center',
              iconBgClass,
            )}
          >
            <TypeIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1 w-full">
            <div className="font-medium text-sm flex items-center gap-2">
              {isIncoming ? t('transactions.received') : t('transactions.sent')}
              {type === 'delegation' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                  {t('transactions.delegation')}
                </span>
              )}

              <div className="flex items-center justify-end gap-1.5">
                <Badge
                  className={cn(
                    'text-[10px] h-5 px-1.5 font-medium border',
                    statusConfig.badgeClass,
                  )}
                >
                  {t(`transactions.status.${status}`)}
                </Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground break-all">
              <TruncatedMiddle text={addressToShow()} />
            </div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div
            className={cn(
              'font-semibold tabular-nums',
              isIncoming
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground',
            )}
          >
            {isIncoming ? '+' : '-'}
            {formatBalance(amount)} {symbol}
          </div>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger>
                <div className="text-xs text-muted-foreground flex items-center gap-1 text-right w-full">
                  {formatTimestamp(numericTimestamp)}
                </div>
              </TooltipTrigger>
              {fullDateTime && (
                <TooltipContent>
                  <span className="text-xs">{fullDateTime}</span>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}

export function WalletCreationFeeCard() {
  const { t } = useTranslation();

  return (
    <Card className="p-4 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="font-medium text-sm text-amber-700 dark:text-amber-300">
              {t('transactions.wallet_creation_fee_title')}
            </div>
            <div className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {t('transactions.wallet_creation_fee_description')}
            </div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
            -1 MINA
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <Badge className="text-[10px] h-5 px-1.5 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              {t('transactions.wallet_creation_fee_badge')}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
