import * as React from 'react';
import { CheckCircle2, Circle, Loader2, HardDrive, AppWindow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LedgerStatus } from '@/lib/ledger';
import { useTranslation } from 'react-i18next';

interface Step {
  id: number;
  labelKey: string;
  descKey: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    labelKey: 'ledger.connect_step.step1_label',
    descKey: 'ledger.connect_step.step1_desc',
  },
  {
    id: 2,
    labelKey: 'ledger.connect_step.step2_label',
    descKey: 'ledger.connect_step.step2_desc',
  },
];

type StepState = 'idle' | 'loading' | 'done' | 'error';

function resolveStepStates(
  status: LedgerStatus | null,
  isChecking: boolean,
): [StepState, StepState] {
  if (isChecking) return ['loading', 'idle'];

  if (status === null) return ['idle', 'idle'];

  if (status === LedgerStatus.DISCONNECTED) return ['error', 'idle'];

  if (status === LedgerStatus.APP_NOT_OPEN) return ['done', 'error'];

  if (status === LedgerStatus.READY) return ['done', 'done'];

  return ['idle', 'idle'];
}

interface StepRowProps {
  step: Step;
  state: StepState;
  icon: React.ReactNode;
}

function StepRow({ step, state, icon }: StepRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 shrink-0">
        {state === 'loading' ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : state === 'done' ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : state === 'error' ? (
          <Circle className="h-5 w-5 text-destructive" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <span
            className={cn(
              'text-sm font-medium',
              state === 'error' && 'text-destructive',
              state === 'idle' && 'text-muted-foreground',
            )}
          >
            {t(step.labelKey)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {t(step.descKey)}
        </p>
      </div>
    </div>
  );
}

interface LedgerConnectStepProps {
  status: LedgerStatus | null;
  isChecking: boolean;
  onVerify: () => void;
  className?: string;
}

export function LedgerConnectStep({
  status,
  isChecking,
  onVerify,
  className,
}: LedgerConnectStepProps) {
  const { t } = useTranslation();
  const [step1State, step2State] = resolveStepStates(status, isChecking);

  const icons = [
    <HardDrive key="hw" className="h-4 w-4 text-muted-foreground" />,
    <AppWindow key="app" className="h-4 w-4 text-muted-foreground" />,
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <StepRow step={STEPS[0]} state={step1State} icon={icons[0]} />
        <div className="ml-2.5 w-px h-4 bg-border" />
        <StepRow step={STEPS[1]} state={step2State} icon={icons[1]} />
      </div>

      <Button
        className="w-full"
        onClick={onVerify}
        disabled={isChecking}
      >
        {isChecking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('ledger.connect_step.checking')}
          </>
        ) : (
          t('ledger.connect_step.verify_button')
        )}
      </Button>

      {status === LedgerStatus.DISCONNECTED && (
        <p className="text-xs text-destructive text-center">
          {t('ledger.errors.disconnected')}
        </p>
      )}

      {status === LedgerStatus.APP_NOT_OPEN && (
        <p className="text-xs text-destructive text-center">
          {t('ledger.errors.app_not_open')}
        </p>
      )}
    </div>
  );
}
