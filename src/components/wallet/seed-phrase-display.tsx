import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';

interface SeedPhraseDisplayProps {
  mnemonic: string[];
  className?: string;
  showCopy?: boolean;
}

export function SeedPhraseDisplay({
  mnemonic,
  className,
  showCopy = true,
}: SeedPhraseDisplayProps) {
  const { isCopied, copy } = useClipboard();

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {mnemonic.map((word, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
          >
            <span className="w-5 text-muted-foreground select-none">
              {index + 1}.
            </span>
            <span className="font-medium text-foreground">{word}</span>
          </div>
        ))}
      </div>
      {showCopy && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => copy(mnemonic.join(' '))}
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}
        </Button>
      )}
    </div>
  );
}
