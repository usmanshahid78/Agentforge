import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-grad-primary text-white shadow-[0_8px_24px_-8px_rgb(var(--c-violet)/0.7)] hover:-translate-y-px hover:shadow-[0_12px_32px_-8px_rgb(var(--c-violet)/0.85)] active:translate-y-0',
        secondary: 'glass text-fg hover:border-line/20 hover:bg-surface/70',
        ghost: 'text-fg-muted hover:bg-line/5 hover:text-fg',
        outline: 'border border-line/15 text-fg hover:border-violet/50 hover:bg-violet/5',
        danger: 'border border-danger/30 bg-danger/15 text-danger hover:bg-danger/25',
        success: 'border border-success/30 bg-success/15 text-success hover:bg-success/25',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants };
