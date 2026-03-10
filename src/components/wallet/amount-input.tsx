import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui';

interface AmountInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

function formatAmountPartsFromString(value: string): {
  integer: string;
  decimal: string;
} {
  if (!value) {
    return { integer: '0', decimal: '' };
  }

  let [integerRaw = '0', decimalRaw = ''] = value.split('.');

  integerRaw = integerRaw.replace(/^0+(?=\d)/, '') || '0';
  decimalRaw = decimalRaw.slice(0, 9);

  const integer = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimal = decimalRaw;

  return { integer, decimal };
}

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  function AmountInput(
    { value, onChange, className, error, placeholder, ...rest },
    ref,
  ) {
    const { integer, decimal } = formatAmountPartsFromString(value || '0');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      let sanitized = raw.replace(/[^0-9.]/g, '');
      const firstDotIndex = sanitized.indexOf('.');
      if (firstDotIndex !== -1) {
        sanitized =
          sanitized.slice(0, firstDotIndex + 1) +
          sanitized.slice(firstDotIndex + 1).replace(/\./g, '');
      }
      if (sanitized.startsWith('.')) {
        sanitized = `0${sanitized}`;
      }
      onChange(sanitized);
    };

    return (
      <div className="relative">
        <Input
          {...rest}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          className={cn(
            'relative z-10 border-none bg-transparent shadow-none px-0 h-auto text-5xl font-mono font-semibold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 text-transparent caret-current',
            className,
          )}
        />
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center font-mono">
          <div className="flex items-baseline">
            <span
              className={cn(
                'text-5xl font-semibold tracking-tight',
                error ? 'text-destructive' : 'text-foreground',
              )}
            >
              {integer}
            </span>
            {decimal && (
              <span className="relative">
                <span className="invisible text-5xl font-semibold tracking-tight">
                  .{decimal}
                </span>
                <span
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-semibold tracking-tight',
                    error ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  .{decimal}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);
