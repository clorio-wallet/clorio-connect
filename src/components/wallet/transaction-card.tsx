import * as React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBalance, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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

export function TransactionCard({
  type,
  status,
  amount,
  timestamp,
  isIncoming,
  symbol = 'MINA',
  onClick,
}: TransactionCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer border-none shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              isIncoming
                ? 'bg-green-100 text-green-600'
                : 'bg-blue-100 text-blue-600',
            )}
          >
            {isIncoming ? (
              <ArrowDownLeft className="h-5 w-5" />
            ) : (
              <ArrowUpRight className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {isIncoming ? t('transactions.received') : t('transactions.sent')}{' '}
              {type === 'delegation' ? t('transactions.delegation') : ''}
            </div>
            <div className="text-xs text-muted-foreground">{timestamp}</div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div
            className={cn(
              'font-semibold',
              isIncoming ? 'text-green-600' : 'text-foreground',
            )}
          >
            {isIncoming ? '+' : '-'}
            {formatBalance(amount)} {symbol}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 font-normal"
            >
              {t(`transactions.status.${status}`)}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
