import React from 'react';
import { useIsRestoring } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';

export const QueryRestorationBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isRestoring = useIsRestoring();

  if (isRestoring) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return <>{children}</>;
};
