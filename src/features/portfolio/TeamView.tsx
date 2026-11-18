import { memo, useMemo, useState, type FormEvent } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, ReactFlowProvider, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crown, Lightbulb, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Project, ProjectAgent } from '@/types';
import { Avatar } from '@/components/avatar/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { industries } from '@/mocks/portfolio';
import { recommendationToAgent, usePortfolio, type NewAgent } from '@/store/portfolio';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/utils';
import { IntegrationList, ParamEditor, SectionLabel } from './shared';

const NODE_W = 240;
const NODE_H = 132;
const GAP_X = 28;
const ROW_Y = 200;

type TeamNodeData = { agent: ProjectAgent; projectId: string; removable: boolean };
type TeamNode = Node<TeamNodeData, 'teamAgent'>;

const hidden = '!size-2 !border-0 !bg-transparent';

const STATUS_LABEL: Record<ProjectAgent['status'], string> = { working: 'Working', idle: 'Ready', paused: 'Paused', error: 'Error', draft: 'Not hired' };

const TeamAgentNode = memo(function TeamAgentNode({ data }: NodeProps<TeamNode>) {
  const { agent, projectId, removable } = data;
  const removeAgent = usePortfolio((s) => s.removeAgent);
  const lead = agent.kind === 'lead';
  return (
    <div
      className={cn(
        'flex size-full flex-col gap-2 rounded-lg border bg-bg-elevated p-3 shadow-card',
        lead ? 'glow-border border-violet/30' : 'border-line/10',
        agent.status === 'draft' && 'border-dashed opacity-80',
      )}
    >
      <Handle type="target" position={Position.Top} className={hidden} isConnectable={false} />
      <div className="flex items-center gap-2.5">
        <Avatar agent={agent} size="sm" showStatus />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 truncate text-sm font-semibold">
            {agent.name} {lead && <Crown className="size-3.5 shrink-0 text-warning" aria-label="lead" />}
          </div>
          <div className="truncate text-xs text-fg-muted">{agent.role}</div>
        </div>
        {removable && (
          <button
            type="button"
            className="nodrag rounded p-1 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
            aria-label={`Remove ${agent.name}`}
            onClick={() => {
              removeAgent(projectId, agent.id);
              toast(`${agent.name} removed from the team`);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <p className="line-clamp-2 text-[11px] leading-snug text-fg-muted">{agent.responsibility}</p>
      <div className="mt-auto flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[10px] text-fg-subtle">{agent.integrations.slice(0, 2).join(' · ')}</span>
        <Badge tone={agent.status === 'working' ? 'success' : agent.status === 'draft' ? 'neutral' : agent.status === 'paused' ? 'warning' : 'cyan'} className="shrink-0 px-1.5 py-0 text-[10px]">
          {STATUS_LABEL[agent.status]}
        </Badge>
      </div>
      <Handle type="source" position={Position.Bottom} className={hidden} isConnectable={false} />
    </div>
  );
});

const nodeTypes = { teamAgent: TeamAgentNode };

/** Lead on top, everyone who reports to them on one row underneath. */
function buildTeamGraph(project: Project): { nodes: TeamNode[]; edges: Edge[] } {
  const lead = project.team.find((a) => a.kind === 'lead');
  const reports = project.team.filter((a) => a.kind !== 'lead');
  const rowW = reports.length * NODE_W + (reports.length - 1) * GAP_X;
  const working = project.status === 'live' || project.status === 'issue';
  const seeded = new Set(project.team.slice(0, 4).map((a) => a.id));
  const nodes: TeamNode[] = [];
  if (lead) nodes.push({ id: lead.id, type: 'teamAgent', position: { x: rowW / 2 - NODE_W / 2, y: 0 }, data: { agent: lead, projectId: project.id, removable: false }, style: { width: NODE_W, height: NODE_H } });
  reports.forEach((a, i) =>
    nodes.push({
      id: a.id,
      type: 'teamAgent',
      position: { x: i * (NODE_W + GAP_X), y: ROW_Y },
      data: { agent: a, projectId: project.id, removable: !seeded.has(a.id) },
      style: { width: NODE_W, height: NODE_H },
    }),
  );
  const edges: Edge[] = reports
    .filter((a) => a.parentId)
    .map((a) => ({
      id: `${a.parentId}-${a.id}`,
      source: a.parentId!,
      target: a.id,
      type: 'smoothstep',
      animated: working && !project.paused,
      className: working ? 'org-edge-handoff active' : 'org-edge-owner',
    }));
  return { nodes, edges };
}

function OrgStructure({ project }: { project: Project }) {
  const theme = useUi((s) => s.theme);
  const graph = useMemo(() => buildTeamGraph(project), [project]);
  return (
    <div className="h-[460px] overflow-hidden rounded-lg border border-line/10 bg-bg/40">
      <ReactFlow
        key={project.team.length}
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.3}
        maxZoom={1.4}
        nodesConnectable={false}
        nodesDraggable={false}
        aria-label={`Team structure for ${project.name}`}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgb(var(--c-border) / 0.12)" />
      </ReactFlow>
    </div>
  );
}

function CreateAgentDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const addAgent = usePortfolio((s) => s.addAgent);
  const [form, setForm] = useState({ name: '', role: '', responsibility: '', integrations: '' });
  const [error, setError] = useState<string>();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError(undefined);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Give the agent a name.');
    if (form.responsibility.trim().length < 8) return setError('Describe what the agent is responsible for.');
    const agent: NewAgent = {
      name: form.name.trim(),
      role: form.role.trim() || 'Specialist',
      responsibility: form.responsibility.trim(),
      integrations: form.integrations.split(',').map((s) => s.trim()).filter(Boolean),
    };
    addAgent(project.id, agent);
    toast.success(`${agent.name} joined the ${project.short} team`);
    setForm({ name: '', role: '', responsibility: '', integrations: '' });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Create an agent</DialogTitle>
            <DialogDescription>The new agent reports to the lead of {project.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Vendor Liaison" autoFocus />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Role
              <Input value={form.role} onChange={set('role')} placeholder="e.g. Supplier follow-up" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Job description
              <Textarea value={form.responsibility} onChange={set('responsibility')} placeholder="What is this agent responsible for?" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Integrations
              <Input value={form.integrations} onChange={set('integrations')} placeholder="Comma separated, e.g. Supplier portal, Email" />
            </label>
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <UserPlus /> Create agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Recommendations({ project }: { project: Project }) {
  const addAgent = usePortfolio((s) => s.addAgent);
  const dismiss = usePortfolio((s) => s.dismissRecommendation);
  const [open, setOpen] = useState(false);
  const locked = project.status === 'not-started';
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="size-4 text-warning" aria-hidden />
        <h2 className="font-display font-semibold">Custom agent recommendation</h2>
      </div>
      {project.recommendations.length === 0 ? (
        <p className="text-sm text-fg-muted">No gaps spotted. The team covers the job description.</p>
      ) : (
        <ul className="space-y-3">
          {project.recommendations.map((r) => (
            <li key={r.id} className="rounded-md border border-line/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-fg-muted">{r.role}</div>
                </div>
                <Button size="icon-sm" variant="ghost" className="size-7" aria-label={`Dismiss ${r.name}`} onClick={() => dismiss(project.id, r.id)}>
                  <X className="!size-3.5" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-fg-muted">
                <span className="font-medium text-fg">Why: </span>
                {r.reason}
              </p>
              <Button
                size="sm"
                variant="primary"
                className="mt-3 w-full"
                disabled={locked}
                onClick={() => {
                  addAgent(project.id, recommendationToAgent(r), r.id);
                  toast.success(`${r.name} joined the ${project.short} team`);
                }}
              >
                <UserPlus /> Create agent
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" size="sm" className="mt-3 w-full" disabled={locked} onClick={() => setOpen(true)}>
        <Plus /> Create a custom agent
      </Button>
      {locked && <p className="mt-2 text-xs text-fg-subtle">Hire the lead agent first.</p>}
      <CreateAgentDialog project={project} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

export function TeamView({ project }: { project: Project }) {
  const industry = industries.find((i) => i.id === project.industryId);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="mb-3 text-center">
            <h2 className="font-display text-lg font-semibold">Organisation structure</h2>
            <p className="text-sm text-fg-muted">
              {industry?.name} · {project.name} · {project.team.length} agents
            </p>
          </div>
          <ReactFlowProvider>
            <OrgStructure project={project} />
          </ReactFlowProvider>
        </Card>
        <Card className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <SectionLabel>Job description</SectionLabel>
            <p className="text-sm">{project.jd.mission}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-fg-muted">
              {project.jd.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <SectionLabel className="mt-5">Integrations</SectionLabel>
            <IntegrationList project={project} />
          </div>
          <div>
            <SectionLabel>Parameters</SectionLabel>
            <ParamEditor project={project} />
          </div>
        </Card>
      </div>
      <aside className="space-y-4">
        <Recommendations project={project} />
      </aside>
    </div>
  );
}
