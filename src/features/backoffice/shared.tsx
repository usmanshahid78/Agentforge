import type { ReactNode } from 'react';
import { CircleDot, OctagonAlert, type LucideIcon } from 'lucide-react';
import type { Organization, OrgMember } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { CheckStatus } from '@/lib/investing';
import { cn } from '@/lib/utils';
import { CHECK_META, memberColor, orgHealth } from './helpers';

export function OrgStatusBadge({ org }: { org: Organization }) {
  const health = orgHealth(org);
  return health === 'breach' ? (
    <Badge tone="danger">
      <OctagonAlert aria-hidden /> Needs attention
    </Badge>
  ) : (
    <Badge tone="success">
      <CircleDot aria-hidden /> Live
    </Badge>
  );
}

export function CheckBadge({ status, className }: { status: CheckStatus; className?: string }) {
  const m = CHECK_META[status];
  return (
    <Badge tone={m.tone} className={className}>
      <m.icon aria-hidden /> {m.label}
    </Badge>
  );
}

export function MemberDot({ org, member, size = 'md' }: { org: Organization; member: OrgMember; size?: 'sm' | 'md' | 'lg' }) {
  const head = member.kind === 'head';
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-display font-semibold text-white',
        size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-14 text-lg' : 'size-10 text-sm',
        head && 'bg-grad-primary',
      )}
      style={head ? undefined : { background: memberColor(org, member.id) }}
      aria-hidden
    >
      {member.name.slice(0, 2)}
    </span>
  );
}

export function StatTile({ label, value, sub, tone, icon: Icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string; icon?: LucideIcon }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      {Icon && <Icon className={cn('mt-0.5 size-4 shrink-0 text-fg-muted', tone)} aria-hidden />}
      <div className="min-w-0">
        <div className="text-xs text-fg-muted">{label}</div>
        <div className={cn('mt-1 font-display text-2xl font-semibold tabular-nums', tone)}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-fg-subtle">{sub}</div>}
      </div>
    </Card>
  );
}

export function ChartCard({ title, description, actions, children, className }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h3 className="font-display font-semibold">{title}</h3>
          {description && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}
