import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Wallet, AlertCircle } from "lucide-react";
import { cn, formatBalance } from "@/lib/utils";
import {
  Input,
  Button,
  Label,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { sendTransactionSchema, type SendTransactionFormData } from "@/lib/validations";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useTranslation } from 'react-i18next';

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
      amount: "",
      recipient: "",
      memo: "",
    },
  });

  const amount = watch("amount");
  const parsedAmount = parseFloat(amount) || 0;
  const fiatValue = parsedAmount * price;
  const maxBalance = parseFloat(balance);

  const handleMaxClick = () => {
    // Leave some dust for fees - simplified logic
    const maxAmount = Math.max(0, maxBalance - 0.1); 
    setValue("amount", maxAmount.toString());
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
      className={cn("space-y-6", className)}
    >
      {/* Amount Input */}
      <div className="space-y-2">
        <Label>{t('send.amount_label')}</Label>
        <div className="relative">
          <Input
            {...register("amount")}
            placeholder="0.00"
            className="pr-20 text-lg font-mono"
            type="number"
            step="any"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleMaxClick}
            >
              MAX
            </Button>
            <span className="font-medium text-muted-foreground">{symbol}</span>
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>
            {t('send.available_label')}: {formatBalance(balance)} {symbol}
          </span>
          <span>≈ ${formatBalance(fiatValue.toString(), 2)}</span>
        </div>
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      {/* Recipient Input */}
      <div className="space-y-2">
        <Label>{t('send.recipient_label')}</Label>
        <div className="relative">
          <Input
            {...register("recipient")}
            placeholder={t('send.recipient_placeholder')}
            className="pl-9 font-mono text-sm"
          />
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        {errors.recipient && (
          <p className="text-sm text-destructive">{errors.recipient.message}</p>
        )}
      </div>

      {/* Memo Input */}
      <div className="space-y-2">
        <Label>{t('send.memo_label')}</Label>
        <Input
          {...register("memo")}
          placeholder={t('send.memo_placeholder')}
        />
        {errors.memo && (
          <p className="text-sm text-destructive">{errors.memo.message}</p>
        )}
      </div>

      {/* Summary Card */}
      <Card className="p-4 bg-muted/50 border-0">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('send.network_fee_label')}</span>
            <span>0.1 {symbol}</span>
          </div>
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>{t('send.total_label')}</span>
            <div className="text-right">
              <div>
                <AnimatedNumber
                  value={parsedAmount + 0.1}
                  decimals={4}
                  suffix={` ${symbol}`}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <AnimatedNumber
                  value={(parsedAmount + 0.1) * price}
                  prefix="$"
                  decimals={2}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      {/* Actions */}
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
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('send.sending_button') : t('send.send_button')}
          {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
