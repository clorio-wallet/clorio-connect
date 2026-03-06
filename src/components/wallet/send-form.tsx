import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { cn, formatBalance } from '@/lib/utils';
import { Input, Button, Label } from '@/components/ui';
import {
  sendTransactionSchema,
  type SendTransactionFormData,
} from '@/lib/validations';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useTranslation } from 'react-i18next';
import { AmountInput } from '@/components/wallet/amount-input';

interface SendFormProps {
  balance: string;
  symbol: string;
  price: number;
  onSubmit: (data: SendTransactionFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function SendForm({
  balance,
  symbol,
  price,
  onSubmit,
  onCancel,
  className,
}: SendFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SendTransactionFormData>({
    resolver: zodResolver(sendTransactionSchema),
    defaultValues: {
      amount: '',
      recipient: '',
      memo: '',
      fee: '0.1',
    },
  });

  const amount = watch('amount');
  const fee = watch('fee');
  const parsedAmount = parseFloat(amount) || 0;
  const parsedFee = parseFloat(fee) || 0;
  const fiatValue = parsedAmount * price;
  const maxBalance = parseFloat(balance);

  const {
    ref: amountRef,
    onBlur: amountOnBlur,
    name: amountName,
  } = register('amount');

  const setPercentageAmount = (percentage: number) => {
    if (!Number.isFinite(maxBalance) || maxBalance <= 0) return;
    const currentFee = parseFloat(watch('fee')) || 0;
    const available = Math.max(0, maxBalance - currentFee);
    const value = available * percentage;
    setValue('amount', value > 0 ? value.toString() : '');
  };

  const onFormSubmit = async (data: SendTransactionFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('send.error_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className={cn('space-y-2', className)}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <AmountInput
              ref={amountRef}
              name={amountName}
              value={amount}
              onChange={(val) =>
                setValue('amount', val, { shouldValidate: true })
              }
              onBlur={amountOnBlur}
              placeholder="0"
              error={!!errors.amount}
              className='py-[20px] cursor-text'
            />
            <div className="mt-1 text-sm text-muted-foreground">
              ${formatBalance(fiatValue.toString(), 2)}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">
              {t('send.available_label')}
            </div>
            <div className="font-semibold">
              {formatBalance(balance)} {symbol}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-3"
            onClick={() => setPercentageAmount(0.25)}
          >
            25%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-3"
            onClick={() => setPercentageAmount(0.5)}
          >
            50%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-3"
            onClick={() => setPercentageAmount(1)}
          >
            100%
          </Button>
        </div>
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className="border-b border-border" />

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          {t('send.recipient_label')}
        </Label>
        <div className="relative">
          <Input
            {...register('recipient')}
            placeholder={t('send.recipient_placeholder')}
            className="bg-transparent border-none shadow-none px-0 h-14 text-lg font-medium tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {errors.recipient && (
          <p className="text-sm text-destructive">{errors.recipient.message}</p>
        )}
      </div>

      <div className="border-b border-border" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            {t('send.memo_label')}
          </Label>
          <span className="text-xs text-muted-foreground">
            {t('common.optional', { defaultValue: 'Optional' })} · 32 chars
          </span>
        </div>
        <Input
          {...register('memo')}
          placeholder={t('send.memo_placeholder')}
          maxLength={32}
          className="bg-transparent border-none shadow-none px-0 h-14 text-lg font-medium tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {errors.memo && (
          <p className="text-sm text-destructive">{errors.memo.message}</p>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            {t('send.network_fee_label')}
          </span>
          <div className="flex items-center gap-2">
            <Input
              {...register('fee')}
              className="w-24 h-8 text-right bg-transparent border-none focus-visible:ring-0 p-0 shadow-none"
              placeholder="0.000"
            />
            <span>{symbol}</span>
          </div>
        </div>
        {errors.fee && (
          <p className="text-sm text-destructive text-right">
            {errors.fee.message}
          </p>
        )}
        <div className="flex justify-between font-medium">
          <span>{t('send.total_label')}</span>
          <span>
            <AnimatedNumber
              value={parsedAmount + parsedFee}
              decimals={4}
              suffix={` ${symbol}`}
              duration={.3}
            />
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? t('send.sending_button') : t('send.continue_button')}
          {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
