import * as React from 'react';
import { cn } from '@/lib/utils';

type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'local';

interface NetworkBadgeProps {
  network: NetworkType | string;
  showDot?: boolean;
  className?: string;
}

const networkConfig: Record<
  NetworkType,
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline' }
> = {
  mainnet: { label: 'Mainnet', variant: 'success' },
  testnet: { label: 'Testnet', variant: 'warning' },
  devnet: { label: 'Devnet', variant: 'secondary' },
  local: { label: 'Local', variant: 'outline' },
};

export function NetworkBadge({
  network,
  showDot = true,
  className,
}: NetworkBadgeProps) {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const config = networkConfig[network as NetworkType] || {
    label: network,
    variant: 'outline' as const,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300',
        'bg-background/80 backdrop-blur-sm shadow-sm',
        isOnline
          ? 'border-green-500/30 text-green-700 dark:text-green-400'
          : 'border-red-500/30 text-red-700 dark:text-red-400',
        className,
      )}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {isOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          )}
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full transition-colors duration-300',
              isOnline ? 'bg-green-500' : 'bg-red-500',
            )}
          />
        </span>
      )}
      <span className="tracking-wide uppercase text-[10px] ">
        {config.label}
      </span>
    </div>
  );
}
