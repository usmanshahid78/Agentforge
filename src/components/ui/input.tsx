import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-md border border-line/10 bg-surface/40 px-3.5 text-sm text-fg placeholder:text-fg-subtle transition-colors focus-visible:border-violet/60 focus-visible:ring-2 focus-visible:ring-violet/30 focus-visible:ring-offset-0 disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-10', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'min-h-24 py-2.5', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';
