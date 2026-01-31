import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsItemProps {
  icon: React.ElementType;
  label: string;
  value?: string | number;
  onClick?: () => void;
  showArrow?: boolean;
  rightIcon?: React.ElementType;
  variant?: 'default' | 'danger';
}

export const SettingsItem = ({
  icon: Icon,
  label,
  value,
  onClick,
  showArrow = true,
  rightIcon: RightIcon,
  variant = 'default',
}: SettingsItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center justify-between p-4 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-b-0 border-border/50',
      variant === 'danger' ? 'bg-red-900/40 border-red-600 border-1' : 'bg-transparent',
    )}
  >
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span
        className={cn(
          'font-medium',
          variant === 'danger' ? 'text-red-500' : 'text-foreground',
        )}
      >
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2 text-muted-foreground">
      {value && <span className="text-sm">{value}</span>}
      {RightIcon ? (
        <RightIcon className="h-4 w-4" />
      ) : showArrow ? (
        <ChevronRight className="h-4 w-4" />
      ) : null}
    </div>
  </div>
);
