import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FolderPlus, LayoutGrid, Maximize, MessageCircle, UserPlus, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import type { Department } from '@/types';
import { Avatar } from '@/components/avatar/Avatar';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sparkline } from '@/components/ui/sparkline';
import { Tooltip } from '@/components/ui/tooltip';
import { owner, businesses } from '@/mocks';
import { useDb, uid } from '@/store/db';
import { useUi } from '@/store/ui';
import { accentColor, departmentById } from '@/lib/departments';
import { TRUST_META } from '@/lib/trust';
import { fmt } from '@/lib/utils';
import { HireDialog } from '@/features/templates/HireDialog';
import { EventList } from '@/features/agents/AgentTabs';
import { buildGraph, type OrgNode } from './layout';
import { nodeTypes } from './nodeTypes';

const ACCENTS: Department['accent'][] = ['violet', 'cyan', 'magenta', 'warning'];

function AddDepartmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addDepartment = useDb((s) => s.addDepartment);
  const departments = useDb((s) => s.departments);
  const [name, setName] = useState('');
  const [accent, setAccent] = useState<Department['accent']>('cyan');
  const [error, setError] = useState<string>();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return setError('Give the department a name.');
    if (departments.some((d) => d.name.toLowerCase() === n.toLowerCase())) return setError('A department with this name already exists.');
    addDepartment({ id: uid('dep'), key: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: n, description: '', accent });
    toast.success(`${n} department added`);
    setName('');
    setError(undefined);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a department</DialogTitle>
            <DialogDescription>Departments group agents that work together.</DialogDescription>
          </DialogHeader>
          <label htmlFor="dept-name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <Input id="dept-name" value={name} onChange={(e) => { setName(e.target.value); setError(undefined); }} placeholder="e.g. Marketing" aria-invalid={!!error} aria-describedby={error ? 'dept-err' : undefined} autoFocus />
          {error && <p id="dept-err" className="mt-1.5 text-xs text-danger">{error}</p>}
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">Colour</legend>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={a}
                  aria-pressed={accent === a}
                  onClick={() => setAccent(a)}
                  className="size-9 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: accentColor(a, 0.8), borderColor: accent === a ? 'rgb(var(--c-fg))' : 'transparent' }}
                />
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentDrawer({ agentId, onClose }: { agentId?: string; onClose: () => void }) {
  const agent = useDb((s) => s.agents.find((a) => a.id === agentId));
  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" aria-describedby={undefined}>
        {agent && (
          <div className="scrollbar-thin flex h-full flex-col overflow-y-auto p-6">
            <div className="flex items-center gap-4">
              <Avatar agent={agent} size="lg" showStatus />
              <div>
                <DialogTitle className="text-xl">{agent.name}</DialogTitle>
                <DialogDescription>
                  {agent.role} · {departmentById(agent.departmentId)?.name}
                </DialogDescription>
                <div className="mt-2 flex gap-1.5">
                  <Badge tone={TRUST_META[agent.trust].tone}>{TRUST_META[agent.trust].label}</Badge>
                  <Badge>{fmt.tenure(agent.hiredAt)}</Badge>
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm text-fg-muted">{agent.jd.mission}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {agent.kpis.slice(0, 2).map((k) => (
                <div key={k.id} className="rounded-md border border-line/10 p-3">
                  <div className="text-xs text-fg-muted">{k.label}</div>
                  <div className="font-display text-lg font-semibold">{k.current === '—' ? 'Collecting' : k.current}</div>
                  {k.current !== '—' && <Sparkline data={k.trend} height={28} />}
                </div>
              ))}
            </div>
            <h3 className="mb-1 mt-6 font-display text-sm font-semibold">Recent activity</h3>
            <EventList agentId={agent.id} limit={3} />
            <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
              <Button variant="primary" asChild>
                <Link to={`/agents/${agent.id}`}>Open profile</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/agents/${agent.id}`}>
                  <MessageCircle /> Talk
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Dialog>
  );
}

function OrgChart() {
  const agents = useDb((s) => s.agents);
  const departments = useDb((s) => s.departments);
  const saved = useDb((s) => s.nodePositions);
  const setNodePosition = useDb((s) => s.setNodePosition);
  const clearNodePositions = useDb((s) => s.clearNodePositions);
  const theme = useUi((s) => s.theme);
  const businessId = useUi((s) => s.businessId);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [selected, setSelected] = useState<string>();
  const [hireOpen, setHireOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);

  const graph = useMemo(
    () => buildGraph({ name: owner.name, initials: owner.initials, business: businesses.find((b) => b.id === businessId)?.name ?? 'Nova Mart' }, departments, agents, saved),
    [agents, departments, saved, businessId],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<OrgNode>(graph.nodes);
  useEffect(() => setNodes(graph.nodes), [graph.nodes, setNodes]);

  const onDragStop = useCallback((_: unknown, node: Node) => setNodePosition(node.id, node.position), [setNodePosition]);
  const autoLayout = () => {
    clearNodePositions();
    window.setTimeout(() => void fitView({ duration: 500, padding: 0.15 }), 60);
  };

  const hasHandoff = graph.edges.some((e) => e.id.startsWith('h-'));

  return (
    <div className="relative h-[calc(100dvh-11rem)] border border-line/10 bg-bg/40 shadow-card min-h-[520px] overflow-hidden rounded-xl md:h-[calc(100dvh-10rem)]">
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onDragStop}
        onNodeClick={(_, n) => n.type === 'agent' && setSelected(n.id)}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesConnectable={false}
        aria-label="Organisation chart"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgb(var(--c-border) / 0.12)" />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          className="!hidden !rounded-lg !border !border-line/10 md:!block"
          maskColor="rgb(var(--c-bg) / 0.6)"
          nodeColor={(n) => (n.type === 'agent' ? 'rgb(var(--c-violet))' : n.type === 'owner' ? 'rgb(var(--c-cyan))' : 'rgb(var(--c-border) / 0.12)')}
        />
        <Panel position="top-left" className="!m-3">
          <div className="glass-strong flex flex-wrap items-center gap-1 rounded-lg p-1.5">
            <Button size="sm" variant="primary" onClick={() => setHireOpen(true)}>
              <UserPlus /> Hire agent
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeptOpen(true)}>
              <FolderPlus /> <span className="hidden sm:inline">Add department</span>
            </Button>
            <span className="mx-1 h-5 w-px bg-line/10" aria-hidden />
            <Tooltip content="Auto-layout">
              <Button size="icon-sm" variant="ghost" onClick={autoLayout} aria-label="Auto-layout">
                <LayoutGrid />
              </Button>
            </Tooltip>
            <Tooltip content="Zoom in">
              <Button size="icon-sm" variant="ghost" onClick={() => void zoomIn({ duration: 200 })} aria-label="Zoom in">
                <ZoomIn />
              </Button>
            </Tooltip>
            <Tooltip content="Zoom out">
              <Button size="icon-sm" variant="ghost" onClick={() => void zoomOut({ duration: 200 })} aria-label="Zoom out">
                <ZoomOut />
              </Button>
            </Tooltip>
            <Tooltip content="Fit to screen">
              <Button size="icon-sm" variant="ghost" onClick={() => void fitView({ duration: 400, padding: 0.15 })} aria-label="Fit to screen">
                <Maximize />
              </Button>
            </Tooltip>
          </div>
        </Panel>
        <Panel position="bottom-left" className="!m-3">
          <div className="glass-strong flex items-center gap-4 rounded-md px-3 py-2 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-violet" /> Handoff in progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-line/30" /> Reports to
            </span>
            {!hasHandoff && <span className="text-fg-subtle">Hire a Stock Planner to see handoffs</span>}
          </div>
        </Panel>
      </ReactFlow>
      <AgentDrawer agentId={selected} onClose={() => setSelected(undefined)} />
      <HireDialog open={hireOpen} onOpenChange={setHireOpen} />
      <AddDepartmentDialog open={deptOpen} onOpenChange={setDeptOpen} />
    </div>
  );
}

export default function CompanyPage() {
  const agents = useDb((s) => s.agents);
  const departments = useDb((s) => s.departments);
  const working = agents.filter((a) => a.status === 'working').length;
  return (
    <Page wide>
      <header className="mb-4 flex flex-wrap items-end gap-3 pt-2">
        <div className="mr-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">AI company</p>
          <h1 className="text-2xl font-semibold md:text-3xl">Your org chart</h1>
        </div>
        <Badge tone="success" className="h-7 px-3">
          <span className="live-dot !size-1.5" /> {working} working
        </Badge>
        <Badge className="h-7 px-3">
          {agents.length} agents · {departments.length} departments
        </Badge>
      </header>
      <ReactFlowProvider>
        <OrgChart />
      </ReactFlowProvider>
      <p className="mt-3 text-xs text-fg-subtle">Drag agents and departments to rearrange. Click an agent to open their file.</p>
    </Page>
  );
}
