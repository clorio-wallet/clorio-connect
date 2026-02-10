import * as React from 'react';
import { VirtualList } from '@/components/ui/virtual-list';
import { ValidatorCard } from './validator-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface Validator {
  address: string;
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
        (v.name && v.name.toLowerCase().includes(lowerSearch)) ||
        v.address.toLowerCase().includes(lowerSearch),
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sticky top-0 z-10 ">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('validators.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className={className}>
        {filteredValidators.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
              <p>{t('validators.empty_list')}</p>
            </div>
        ) : (
            filteredValidators.map((validator, index) => (
                <motion.div
                  key={validator.address}
                  className="px-4 py-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ValidatorCard
                    {...validator}
                    onDelegate={() => onDelegate?.(validator)}
                  />
                </motion.div>
            ))
        )}
      </div>
    </div>
  );
}
