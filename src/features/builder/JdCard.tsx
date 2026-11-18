import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleDashed, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/avatar/Avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { departmentByKey } from '@/lib/departments';
import { fmt } from '@/lib/utils';
import { filledFields, type JdDraft, type JdField } from './interview';

function Field({
  label,
  field,
  filled,
  value,
  children,
}: {
  label: string;
  field: JdField;
  filled: Set<JdField>;
  /** Changes in this value retrigger the fill animation. */
  value: unknown;
  children: ReactNode;
}) {
  const isFilled = filled.has(field);
  return (
    <div className="border-b border-line/5 py-3.5 last:border-0">
      <div className="mb-1.5 flex items-center gap-2">
        {isFilled ? (
          <CheckCircle2 className="size-3.5 text-success" aria-hidden />
        ) : (
          <CircleDashed className="size-3.5 text-fg-subtle" aria-hidden />
        )}
        <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">{label}</h4>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {isFilled ? (
          <motion.div
            key={JSON.stringify(value)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative -mx-2 rounded-md px-2 py-0.5 text-sm"
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-md bg-violet/20"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.6 }}
            />
            <div className="relative">{children}</div>
          </motion.div>
        ) : (
          <motion.div key="empty" exit={{ opacity: 0 }} className="space-y-1.5 pt-0.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="space-y-1">
    {items.map((i) => (
      <li key={i} className="flex gap-2">
        <span className="mt-2 size-1 shrink-0 rounded-full bg-cyan" aria-hidden />
        <span>{i}</span>
      </li>
    ))}
  </ul>
);

export function JdCard({ draft, className }: { draft: JdDraft; className?: string }) {
  const filled = filledFields(draft);
  const dept = draft.department ? departmentByKey(draft.department) : undefined;

  return (
    <article aria-label="Job description" className={className}>
      <header className="flex items-start gap-4 border-b border-line/10 pb-4">
        <Avatar
          agent={{ name: draft.name ?? draft.title ?? '?', departmentId: dept?.id ?? 'dep-ops', status: 'draft' }}
          size="lg"
          state={filled.size < 11 ? 'listening' : 'idle'}
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">Job description</p>
          <AnimatePresence mode="wait">
            <motion.h3
              key={`${draft.name}-${draft.title}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 truncate text-xl font-semibold"
            >
              {draft.name ? `${draft.name}, ` : ''}
              {draft.title ?? 'New role'}
            </motion.h3>
          </AnimatePresence>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dept && <Badge tone={dept.accent === 'warning' ? 'warning' : dept.accent}>{dept.name}</Badge>}
            <Badge>Starts in Shadow mode</Badge>
          </div>
        </div>
      </header>

      <div>
        <Field label="Mission" field="mission" filled={filled} value={draft.mission}>
          <p className="text-fg">{draft.mission}</p>
        </Field>
        <Field label="Responsibilities" field="responsibilities" filled={filled} value={draft.responsibilities}>
          <Bullets items={draft.responsibilities ?? []} />
        </Field>
        <Field label="Inputs / data needed" field="inputs" filled={filled} value={draft.inputs}>
          <div className="flex flex-wrap gap-1.5">
            {(draft.inputs ?? []).map((i) => (
              <Badge key={i} tone="cyan">
                {i}
              </Badge>
            ))}
          </div>
        </Field>
        <Field label="Outputs" field="outputs" filled={filled} value={draft.outputs}>
          <Bullets items={draft.outputs ?? []} />
        </Field>
        <Field label="Schedule" field="schedule" filled={filled} value={draft.schedule}>
          <p className="font-mono text-[13px]">{draft.schedule}</p>
        </Field>
        <Field label="Success KPIs" field="kpis" filled={filled} value={draft.kpis}>
          <Bullets items={draft.kpis ?? []} />
        </Field>
        <Field label="Limits" field="limits" filled={filled} value={[draft.canDecideAlone, draft.needsApproval]}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-success/20 bg-success/5 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-success">
                <ShieldCheck className="size-3.5" aria-hidden /> Decides alone
              </div>
              <Bullets items={draft.canDecideAlone ?? []} />
            </div>
            <div className="rounded-md border border-warning/20 bg-warning/5 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-warning">
                <ShieldAlert className="size-3.5" aria-hidden /> Needs your approval
              </div>
              <Bullets items={draft.needsApproval ?? []} />
            </div>
          </div>
        </Field>
        <Field label="Spending cap" field="spendingCapPerDay" filled={filled} value={draft.spendingCapPerDay}>
          <p>
            <span className="font-display text-lg font-semibold">{fmt.money(draft.spendingCapPerDay ?? 0)}</span>
            <span className="text-fg-muted"> per day{draft.spendingCapPerDay === 0 ? ' (cannot spend money)' : ''}</span>
          </p>
        </Field>
        <Field label="Escalation rules" field="escalation" filled={filled} value={draft.escalation}>
          <Bullets items={draft.escalation ?? []} />
        </Field>
      </div>
    </article>
  );
}
