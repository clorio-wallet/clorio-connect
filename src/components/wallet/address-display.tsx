import * as React from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn, formatAddress } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";

interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  truncateStart?: number;
  truncateEnd?: number;
  showCopy?: boolean;
  showExplorer?: boolean;
  explorerUrl?: string;
  className?: string;
  mono?: boolean;
}

export function AddressDisplay({
  address,
  truncate = true,
  truncateStart = 6,
  truncateEnd = 4,
  showCopy = true,
  showExplorer = false,
  explorerUrl,
  className,
  mono = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const displayAddress = truncate
    ? formatAddress(address, truncateStart, truncateEnd)
    : address;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    // Auto-clear for safety after 60s, per spec
    setTimeout(() => {
      setCopied(false);
      // Attempt to clear clipboard
      navigator.clipboard.writeText("").catch(() => {});
    }, 60000);
    // Reset visual feedback after 2s
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          mono && "font-mono",
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="select-all text-sm cursor-default"
              aria-label={`Address: ${address}`}
            >
              {displayAddress}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-xs max-w-[300px] break-all">
            {address}
          </TooltipContent>
        </Tooltip>

        {showCopy && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label={copied ? "Copied" : "Copy address"}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
          </Tooltip>
        )}

        {showExplorer && explorerUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`${explorerUrl}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "p-1 rounded-md transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label="View on explorer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </TooltipTrigger>
            <TooltipContent>View on explorer</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
