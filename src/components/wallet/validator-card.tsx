import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatAddress, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { TruncatedMiddle } from '../ui/truncated-middle';

interface ValidatorCardProps {
  name?: string;
  publicKey: string;
  stake: number;
  fee: number;
  isDelegated?: boolean;
  onDelegate?: () => void;
  imgurl?: string;
}

export function ValidatorCard({
  name,
  publicKey,
  fee,
  isDelegated,
  onDelegate,
  imgurl,
}: ValidatorCardProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDelegated) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDelegate?.();
    }
  };

  return (
    <Card
      onClick={() => !isDelegated && onDelegate?.()}
      onKeyDown={handleKeyDown}
      role={isDelegated ? undefined : 'button'}
      tabIndex={isDelegated ? -1 : 0}
      aria-disabled={isDelegated}
      className={cn(
        'p-4 transition-all hover:shadow-md relative overflow-hidden',
        !isDelegated && 'cursor-pointer hover:bg-background/5',
        isDelegated && 'border-primary bg-primary/5',
      )}
    >
      {imgurl && (
        <div
          className="absolute inset-0 z-0 opacity-[0.2] pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${imgurl})`,
            maskImage: 'linear-gradient(to right, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
          }}
        />
      )}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary overflow-hidden shrink-0">
            {imgurl ? (
              <img
                src={imgurl}
                alt={name || publicKey}
                className="h-full w-full object-cover"
              />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1 self-center">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {name || formatAddress(publicKey)}
              </h3>
              {isDelegated && (
                <Badge variant="default" className="text-[10px] h-5">
                  {t('validators.current_badge')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 py-3 bg-muted/50 rounded-lg relative z-10 px-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t('validators.address_label', 'Address')}
          </span>
          {/* <span className="font-medium text-right break-all">{formatAddress(publicKey)}</span> */}
          <TruncatedMiddle text={publicKey} className="text-right" />
        </div>
        <div className="flex items-center justify-between text-xs border-t border-border pt-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            {t('validators.fee_label')}
          </div>
          <div className="font-medium">{fee}%</div>
        </div>
      </div>
    </Card>
  );
}
