import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line/15 bg-line/5 px-1.5 font-mono text-[10px] text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}
