import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AlertCircle, TrendingUp } from "lucide-react";
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
import { stakeTransactionSchema, type StakeTransactionFormData } from "@/lib/validations";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useTranslation } from "react-i18next";

interface Validator {
  id: string;
  name: string;
  apy: number;
}

interface StakeFormProps {
  balance: string;
  symbol: string;
  validators: Validator[];
  onSubmit: (data: StakeTransactionFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function StakeForm({
  balance,
  symbol,
  validators,
  onSubmit,
  onCancel,
  className,
}: StakeFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StakeTransactionFormData>({
    resolver: zodResolver(stakeTransactionSchema),
    defaultValues: {
      amount: "",
      validatorId: "",
    },
  });

  const amount = watch("amount");
  const validatorId = watch("validatorId");
  
  const selectedValidator = React.useMemo(
    () => validators.find((v) => v.id === validatorId),
    [validators, validatorId]
  );

  const parsedAmount = parseFloat(amount) || 0;
  const estimatedRewards = selectedValidator
    ? parsedAmount * (selectedValidator.apy / 100)
    : 0;

  const handleMaxClick = () => {
    const maxBalance = parseFloat(balance);
    const maxAmount = Math.max(0, maxBalance - 0.1); // Leave dust for fees
    setValue("amount", maxAmount.toString());
  };

  const onFormSubmit = async (data: StakeTransactionFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("staking.error_failed")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className={cn("space-y-6", className)}
    >
      <div className="space-y-2">
        <Label>{t("staking.validator_label")}</Label>
        <Select
          onValueChange={(val) => setValue("validatorId", val)}
          defaultValue={validatorId}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("staking.validator_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {validators.map((validator) => (
              <SelectItem key={validator.id} value={validator.id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{validator.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {validator.apy}% APY
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.validatorId && (
          <p className="text-sm text-destructive">{errors.validatorId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("staking.amount_label")}</Label>
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
              {t("staking.max_button")}
            </Button>
            <span className="font-medium text-muted-foreground">{symbol}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground px-1">
          {t("staking.available_label")}: {formatBalance(balance)} {symbol}
        </div>
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-sm font-medium">
              {t("staking.estimated_rewards_title")}
            </div>
            <div className="text-2xl font-bold text-primary">
              <AnimatedNumber
                value={estimatedRewards}
                decimals={4}
                suffix={` ${symbol}`}
              />
            </div>
            {selectedValidator && (
              <div className="text-xs text-muted-foreground">
                {t("staking.estimated_rewards_desc", {
                  apy: selectedValidator.apy,
                  name: selectedValidator.name,
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-2 p-3 text-sm bg-muted/50 rounded-md text-muted-foreground">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>{t("staking.warning_text")}</p>
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
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("staking.staking_button") : t("staking.stake_button")}
          {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
