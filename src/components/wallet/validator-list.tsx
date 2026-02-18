import * as React from 'react';
import { VirtualList } from '@/components/ui/virtual-list';
import { ValidatorCard } from './validator-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Validator {
  address?: string;
  publicKey: string;
  name?: string;
  stake: number;
  fee: number;
  isDelegated?: boolean;
  imgurl?: string;
}

interface ValidatorListProps {
  validators: Validator[];
  isLoading?: boolean;
  onDelegate?: (validator: Validator) => void;
  className?: string;
}

export function ValidatorList({
  validators,
  isLoading,
  onDelegate,
  className,
}: ValidatorListProps) {
  const [search, setSearch] = React.useState('');
  const { t } = useTranslation();

  const filteredValidators = React.useMemo(() => {
    if (!validators) return [];
    if (!search) return validators;
    const lowerSearch = search.toLowerCase().trim();
    return validators.filter(
      (v) =>
        (v.name?.toLowerCase()?.includes(lowerSearch)) ||
        (v.address?.toLowerCase()?.includes(lowerSearch)),
    );
  }, [validators, search]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center h-48 text-center px-6 py-8 text-muted-foreground gap-2">
      <div className="h-10 w-10 rounded-full border border-dashed border-border flex items-center justify-center">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium mt-2">
        {t('validators.empty_list')}
      </p>
      <p className="text-xs text-muted-foreground/80">
        {search
          ? t('validators.empty_search_hint', 'Try a different name or address.')
          : t(
              'validators.empty_generic_hint',
              'No validators available for this network right now.',
            )}
      </p>
    </div>
  );

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      <div className="bg-background/80 backdrop-blur-sm border-b border-border/50 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('validators.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <VirtualList
          items={filteredValidators}
          estimateSize={() => 140}
          emptyComponent={emptyState}
          renderItem={(validator) => (
            <div className=" py-2">
              <ValidatorCard
                {...validator}
                publicKey={validator.publicKey}
                onDelegate={() => onDelegate?.(validator)}
                isDelegated={validator.publicKey === 'B62qq6ZYPG5JsjZnGJ3pADmRn6hU6qy13EhraTSymjSgyEDwoDR9Gd6'} // Just in case, but ideally should come from props
              />
            </div>
          )}
        />
      </div>
    </div>
  );
}
