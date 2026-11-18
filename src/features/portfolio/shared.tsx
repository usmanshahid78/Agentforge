import { useState } from 'react';
import { Check, Pencil, Plug } from 'lucide-react';
import { toast } from 'sonner';
import type { Project, ProjectStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_META } from '@/lib/portfolio';
import { usePortfolio } from '@/store/portfolio';
import { cn } from '@/lib/utils';

export function StatusDot({ status, className }: { status: ProjectStatus; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', STATUS_META[status].dot, status === 'live' && 'animate-pulse-live', className)} />;
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone}>
      <StatusDot status={status} className="!size-1.5" /> {m.label}
    </Badge>
  );
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted', className)} aria-label="Status legend">
      {(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <StatusDot status={s} /> {STATUS_META[s].label}
        </li>
      ))}
    </ul>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-fg-subtle', className)}>{children}</h3>;
}

/** Parameters as a definition list; click the pencil to edit a value in place. */
export function ParamEditor({ project, editable = true }: { project: Project; editable?: boolean }) {
  const setParam = usePortfolio((s) => s.setParam);
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState('');

  const save = (key: string, label: string) => {
    const v = draft.trim();
    if (v) {
      setParam(project.id, key, v);
      toast.success(`${label} set to ${v}`);
    }
    setEditing(undefined);
  };

  return (
    <dl className="divide-y divide-line/5 rounded-md border border-line/10">
      {project.params.map((p) => (
        <div key={p.key} className="flex items-center gap-3 px-3 py-2 text-sm">
          <dt className="w-36 shrink-0 text-fg-muted">{p.label}</dt>
          <dd className="flex min-w-0 flex-1 items-center justify-end gap-1">
            {editing === p.key ? (
              <form
                className="flex w-full items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  save(p.key, p.label);
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setEditing(undefined)}
                  aria-label={p.label}
                  className="h-8"
                  autoFocus
                />
                <Button type="submit" size="icon-sm" variant="ghost" aria-label={`Save ${p.label}`}>
                  <Check />
                </Button>
              </form>
            ) : (
              <>
                <span className="truncate text-right font-medium" title={p.hint}>
                  {p.value}
                </span>
                {editable && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 shrink-0"
                    aria-label={`Edit ${p.label}`}
                    onClick={() => {
                      setDraft(p.value);
                      setEditing(p.key);
                    }}
                  >
                    <Pencil className="!size-3.5" />
                  </Button>
                )}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function IntegrationList({ project, connectable = true }: { project: Project; connectable?: boolean }) {
  const connect = usePortfolio((s) => s.connectIntegration);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {project.integrations.map((i) =>
        i.status === 'connected' ? (
          <li key={i.name}>
            <Badge tone="success">
              <Check /> {i.name}
            </Badge>
          </li>
        ) : (
          <li key={i.name}>
            {connectable ? (
              <button
                type="button"
                onClick={() => {
                  connect(project.id, i.name);
                  toast.success(`${i.name} connected`);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-warning/50 bg-warning/5 px-2.5 py-0.5 text-xs font-medium text-warning transition-colors hover:bg-warning/15"
                aria-label={`Connect ${i.name}`}
              >
                <Plug className="size-3" /> {i.name} · Connect
              </button>
            ) : (
              <Badge tone="warning">
                <Plug /> {i.name} · pending
              </Badge>
            )}
          </li>
        ),
      )}
    </ul>
  );
}
