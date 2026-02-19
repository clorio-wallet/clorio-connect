import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const FadeWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className="w-full h-full space-y-6 py-2"
  >
    {children}
  </motion.div>
);

const HeaderSkeleton = () => (
  <div className="flex justify-between items-center mb-6">
    <Skeleton className="h-6 w-24 rounded-full" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-8 rounded-md" />
      <Skeleton className="h-8 w-8 rounded-md" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <FadeWrapper>
    <HeaderSkeleton />
    <div className="space-y-4">
      {/* Account Card */}
      <div className="rounded-xl border border-border/50 p-6 space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
        </div>
      </div>
      
      {/* Wallet Actions */}
      <div className="flex gap-4">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 flex-1 rounded-lg" />
      </div>

      {/* Transactions */}
      <div className="space-y-4 pt-4">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
        </div>
      </div>
    </div>
  </FadeWrapper>
);

export const TransactionsSkeleton = () => (
  <FadeWrapper>
    <HeaderSkeleton />
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  </FadeWrapper>
);

export const StakingSkeleton = () => (
  <FadeWrapper>
    <HeaderSkeleton />
    <div className="space-y-6">
        {/* Staking Info Card */}
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        
        {/* Validator List */}
        <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" /> {/* Search */}
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        </div>
    </div>
  </FadeWrapper>
);

export const SendSkeleton = () => (
  <FadeWrapper>
    <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-6 w-24" />
    </div>
    <div className="space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg mt-8" />
    </div>
  </FadeWrapper>
);

export const SettingsSkeleton = () => (
  <FadeWrapper>
    <div className="space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>
        </div>
        <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        </div>
    </div>
  </FadeWrapper>
);

export const OnboardingSkeleton = () => (
    <FadeWrapper>
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="pt-2 flex gap-2">
                <Skeleton className="h-10 flex-1 rounded-md" />
                <Skeleton className="h-10 flex-1 rounded-md" />
            </div>
        </div>
    </FadeWrapper>
);

export const GenericSkeleton = () => (
    <FadeWrapper>
        <div className="space-y-6 flex flex-col items-center justify-center h-[60vh]">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-48" />
        </div>
    </FadeWrapper>
);
