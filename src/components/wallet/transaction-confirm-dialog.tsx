import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Separator,
} from "@/components/ui";
import { AddressDisplay } from "./address-display";
import { NetworkBadge } from "./network-badge";
import { HoldToConfirmButton } from "./hold-to-confirm-button";
import { useTranslation } from "react-i18next";

interface TransactionData {
  to: string;
  amount: string;
  symbol: string;
  fee: string;
  network: string;
  memo?: string;
}

interface TransactionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  transaction: TransactionData;
  origin?: string;
  loading?: boolean;
}

export function TransactionConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  transaction,
  origin,
  loading = false,
}: TransactionConfirmDialogProps) {
  const { t } = useTranslation();

  const total = (
    parseFloat(transaction.amount) + parseFloat(transaction.fee)
  ).toFixed(8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("transaction_confirm.title")}
          </DialogTitle>
          {origin && (
            <DialogDescription className="flex items-center gap-2">
              <span>{t("transaction_confirm.request_from")}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                {origin}
              </code>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              {t("transaction_confirm.recipient_label")}
            </label>
            <div className="rounded-lg bg-muted p-3">
              <AddressDisplay
                address={transaction.to}
                truncate={false}
                showCopy={true}
                className="text-sm break-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              {t("transaction_confirm.amount_label")}
            </label>
            <div className="text-2xl font-semibold">
              {transaction.amount}{" "}
              <span className="text-muted-foreground">{transaction.symbol}</span>
            </div>
          </div>

          {transaction.memo && (
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                {t("transaction_confirm.memo_label")}
              </label>
              <div className="rounded-lg bg-muted p-3 text-sm">
                {transaction.memo}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("transaction_confirm.network_fee_label")}
              </span>
              <span>
                {transaction.fee} {transaction.symbol}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>{t("transaction_confirm.total_label")}</span>
              <span>
                {total} {transaction.symbol}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("transaction_confirm.network_label")}
            </span>
            <NetworkBadge network={transaction.network} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <HoldToConfirmButton
            onConfirm={onConfirm}
            holdDuration={2000}
            disabled={loading}
          >
            {loading
              ? t("transaction_confirm.processing")
              : t("transaction_confirm.hold_to_confirm")}
          </HoldToConfirmButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
