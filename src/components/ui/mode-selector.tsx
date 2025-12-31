import React from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Props = {
  mode: 'popup' | 'sidepanel';
  onChange: (mode: 'popup' | 'sidepanel') => void;
  className?: string;
};

export function ModeSelector({ mode, onChange, className }: Props) {
  return (
    <div className={cn("w-full", className)}>
      <Tabs value={mode} onValueChange={(v) => onChange(v as 'popup' | 'sidepanel')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="popup">Popup</TabsTrigger>
          <TabsTrigger value="sidepanel">Side Panel</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
