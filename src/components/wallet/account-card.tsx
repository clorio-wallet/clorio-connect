import * as React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Copy, Check, MoreVertical, Eye, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
} from "@/components/ui";
import { AddressDisplay } from "./address-display";
import { BalanceDisplay } from "./balance-display";

interface AccountCardProps {
  account: {
    name: string;
    address: string;
    balance: string;
    symbol: string;
    fiatValue?: string;
  };
  isActive?: boolean;
  isLoading?: boolean;
  explorerUrl?: string;
  onSelect?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onViewPrivateKey?: () => void;
  className?: string;
}

export function AccountCard({
  account,
  isActive = false,
  isLoading = false,
  explorerUrl,
  onSelect,
  onRename,
  onDelete,
  onViewPrivateKey,
  className,
}: AccountCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      transition={{ 
        layout: { duration: 0.3, type: "spring", stiffness: 300, damping: 30 },
        default: { duration: 0.15 }
      }}
    >
      <Card
        className={cn(
          "relative cursor-pointer transition-all",
          isActive 
            ? "border-primary bg-primary/5 ring-1 ring-primary" 
            : "hover:border-primary/50",
          className
        )}
        onClick={onSelect}
      >
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
        )}

        <div className="p-4">
          <div className="flex items-start justify-between">
            {/* Account Info */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{account.name}</h3>
                {isActive && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {t('settings.account_card.active')}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <AddressDisplay 
                  address={account.address} 
                  showCopy={false}
                  showExplorer={!!explorerUrl}
                  explorerUrl={explorerUrl}
                  className="text-muted-foreground"
                />
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRename}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t('settings.account_card.rename')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewPrivateKey}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('settings.account_card.view_private_key')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.account_card.remove')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Balance */}
          <div className="mt-3">
            <BalanceDisplay
              balance={account.balance}
              symbol={account.symbol}
              showFiat
              fiatValue={account.fiatValue}
              size="sm"
              loading={isLoading}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
