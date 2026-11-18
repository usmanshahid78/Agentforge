import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CircleDashed, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Page, PageHeader } from './Page';

interface PhasePlaceholderProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  phase: number;
  icon: LucideIcon;
  planned: string[];
  children?: ReactNode;
}

/**
 * Temporary screen body for routes whose feature lands in a later phase.
 * Each feature's page file replaces this when its phase is built.
 */
export function PhasePlaceholder({ eyebrow, title, description, phase, icon: Icon, planned, children }: PhasePlaceholderProps) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:p-8">
          <div className="relative grid size-16 shrink-0 place-items-center rounded-xl border border-violet/30 bg-violet/10 text-violet">
            <Icon className="size-7" aria-hidden />
            <span className="absolute inset-0 rounded-xl shadow-glow-violet" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">Coming in phase {phase}</h2>
              <Badge tone="cyan">Scaffolded</Badge>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              The route, layout, data layer and types are in place. This screen will include:
            </p>
            <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="mt-4 grid gap-2 sm:grid-cols-2">
              {planned.map((p) => (
                <motion.li key={p} variants={staggerItem} className="flex items-start gap-2.5 text-sm">
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />
                  <span>{p}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </Card>
    </Page>
  );
}
