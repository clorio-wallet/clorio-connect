import * as React from "react";
import { ShieldCheck, Users, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAddress, cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ValidatorCardProps {
  name?: string;
  address: string;
  stake: number;
  fee: number;
  delegators?: number;
  isDelegated?: boolean;
  onDelegate?: () => void;
}

export function ValidatorCard({
  name,
  address,
  stake,
  fee,
  delegators,
  isDelegated,
  onDelegate,
}: ValidatorCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn(
      "p-4 transition-all hover:shadow-md",
      isDelegated && "border-primary bg-primary/5"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {name || formatAddress(address)}
              </h3>
              {isDelegated && (
                <Badge variant="default" className="text-[10px] h-5">
                  {t("validators.current_badge")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground break-all line-clamp-1">
              {address}
            </p>
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant={isDelegated ? "outline" : "default"}
          onClick={onDelegate}
          disabled={isDelegated}
        >
          {isDelegated ? t("validators.delegated_badge") : t("validators.delegate_button")}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 py-3 bg-muted/50 rounded-lg">
        <div className="text-center space-y-1 border-r border-border last:border-0">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Percent className="h-3 w-3" /> {t("validators.fee_label")}
          </div>
          <div className="font-medium text-sm">{fee}%</div>
        </div>
        <div className="text-center space-y-1 border-r border-border last:border-0">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> {t("validators.users_label")}
          </div>
          <div className="font-medium text-sm">{delegators || "-"}</div>
        </div>
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            {t("validators.total_stake_label")}
          </div>
          <div className="font-medium text-sm">{(stake / 1000000).toFixed(1)}M</div>
        </div>
      </div>
    </Card>
  );
}
