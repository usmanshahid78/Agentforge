import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Crown } from 'lucide-react';
import { Avatar } from '@/components/avatar/Avatar';
import { Badge } from '@/components/ui/badge';
import { accentColor } from '@/lib/departments';
import { TRUST_META } from '@/lib/trust';
import { cn } from '@/lib/utils';
import type { AgentNodeData, DeptNodeData, OrgNode, OwnerNodeData } from './layout';

type P<T extends OrgNode['type']> = NodeProps<Extract<OrgNode, { type: T }>>;

const hidden = '!size-2 !border-0 !bg-transparent';

export const OwnerNode = memo(function OwnerNode({ data }: P<'owner'>) {
  const d = data as OwnerNodeData;
  return (
    <div className="glow-border flex w-[260px] items-center gap-3 rounded-xl border border-line/10 bg-bg-elevated px-4 py-3 shadow-card">
      <span className="grid size-11 place-items-center rounded-full bg-grad-primary font-display font-semibold text-white">{d.initials}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          {d.name} <Crown className="size-3.5 text-warning" aria-label="owner" />
        </div>
        <div className="text-xs text-fg-muted">Owner · {d.business}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

export const DepartmentNode = memo(function DepartmentNode({ data, selected }: P<'department'>) {
  const { department, count } = data as DeptNodeData;
  return (
    <div
      className={cn('size-full rounded-xl border border-dashed transition-colors', selected && 'border-solid')}
      style={{ borderColor: accentColor(department.accent, selected ? 0.6 : 0.35), background: accentColor(department.accent, 0.05) }}
    >
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      <div className="flex items-center gap-2 px-4 pt-3.5">
        <span className="size-2 rounded-full" style={{ background: accentColor(department.accent) }} aria-hidden />
        <span className="font-display text-sm font-semibold">{department.name}</span>
        <span className="font-mono text-[10px] text-fg-subtle">{count} agent{count === 1 ? '' : 's'}</span>
      </div>
      {count === 0 && <p className="px-4 pt-3 text-xs text-fg-subtle">No agents yet. Use Hire agent to add one.</p>}
    </div>
  );
});

export const AgentNode = memo(function AgentNode({ data, selected }: P<'agent'>) {
  const { agent } = data as AgentNodeData;
  const trust = TRUST_META[agent.trust];
  return (
    <div
      className={cn(
        'flex size-full cursor-pointer items-center gap-3 rounded-lg border border-line/10 bg-bg-elevated px-3 shadow-card transition-shadow',
        selected ? 'shadow-glow-violet' : 'hover:shadow-glow-cyan',
      )}
    >
      <Handle id="in" type="target" position={Position.Left} className={hidden} isConnectable={false} />
      <Avatar agent={agent} size="md" showStatus state={agent.status === 'error' ? 'alert' : 'idle'} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{agent.name}</div>
        <div className="truncate text-xs text-fg-muted">{agent.role}</div>
        <Badge tone={trust.tone} className="mt-1 px-1.5 py-0 text-[10px]">
          {trust.label}
        </Badge>
      </div>
      <Handle id="out" type="source" position={Position.Right} className={hidden} isConnectable={false} />
    </div>
  );
});

