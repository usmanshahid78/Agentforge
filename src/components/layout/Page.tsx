import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

/** Route wrapper: fade + 12px slide transition, sets the document title. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.main
      id="main"
      variants={reduced ? undefined : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('mx-auto w-full px-4 pb-32 pt-2 md:px-6 md:pb-16', wide ? 'max-w-[1800px]' : 'max-w-7xl', className)}
    >
      {children}
    </motion.main>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 pt-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cyan">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
