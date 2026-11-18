import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Pause, Play, Plus, Sparkles, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { Agent, AgentMode, JobDescription, Severity } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressRing, Segmented, Slider, Switch } from '@/components/ui/controls';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Sparkline } from '@/components/ui/sparkline';
import { EmptyState } from '@/components/ui/states';
import { reviews as allReviews } from '@/mocks';
import { parseDay } from '@/mocks/random';
import { MODELS } from '@/store/builder';
import { useDb } from '@/store/db';
import { cn, fmt } from '@/lib/utils';

const SEV: Record<Severity, { icon: typeof Info; cls: string; label: string }> = {
  info: { icon: Info, cls: 'text-cyan', label: 'Info' },
  success: { icon: CheckCircle2, cls: 'text-success', label: 'Success' },
  warning: { icon: AlertTriangle, cls: 'text-warning', label: 'Warning' },
  critical: { icon: AlertOctagon, cls: 'text-danger', label: 'Critical' },
};

export function EventList({ agentId, limit }: { agentId: string; limit?: number }) {
  const all = useDb((s) => s.events);
  const events = all.filter((e) => e.agentId === agentId).slice(0, limit);
  if (!events.length) return <EmptyState title="No activity yet" description="Actions will show up here as soon as this agent starts working." />;
  return (
    <ol className="space-y-1">
      {events.map((e) => {
        const s = SEV[e.severity];
        const Icon = s.icon;
        return (
          <li key={e.id} className="flex gap-3 rounded-md px-2 py-2.5 hover:bg-line/[0.03]">
            <Icon className={cn('mt-0.5 size-4 shrink-0', s.cls)} aria-label={s.label} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{e.title}</div>
              <div className="text-sm text-fg-muted">{e.detail}</div>
            </div>
            <time className="shrink-0 font-mono text-[11px] text-fg-subtle" dateTime={e.at}>
              {fmt.ago(e.at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

export function OverviewTab({ agent }: { agent: Agent }) {
  const net = agent.valuePerDay - agent.costPerDay;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {agent.kpis.map((k) => {
          const empty = k.current === '—';
          const first = k.trend[0] ?? 0;
          const last = k.trend.at(-1) ?? 0;
          const good = k.direction === 'up-good' ? last >= first : last <= first;
          return (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-fg-muted">{k.label}</span>
                {!empty && <Badge tone={good ? 'success' : 'warning'}>{good ? 'On track' : 'Watch'}</Badge>}
              </div>
              <div className="mt-2 font-display text-2xl font-semibold">{empty ? 'Collecting' : k.current}</div>
              <div className="text-xs text-fg-subtle">Target {k.target}</div>
              {!empty && <Sparkline data={k.trend} className="mt-3" color={good ? 'rgb(var(--c-success))' : 'rgb(var(--c-warning))'} />}
            </Card>
          );
        })}
        <Card className="p-4">
          <span className="text-sm text-fg-muted">Salary vs value</span>
          <div className="mt-2 font-display text-2xl font-semibold">{agent.valuePerDay ? `${(agent.valuePerDay / agent.costPerDay).toFixed(1)}x` : 'New'}</div>
          <div className="text-xs text-fg-subtle">
            {fmt.moneyPrecise(agent.costPerDay)} cost vs {fmt.money(agent.valuePerDay)} value per day
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-line/10">
            <div className="bg-magenta" style={{ width: `${Math.min(100, (agent.costPerDay / Math.max(agent.valuePerDay, agent.costPerDay)) * 100)}%` }} />
          </div>
          <div className="mt-1 text-xs text-fg-subtle">{net > 0 ? `Net +${fmt.money(net)} a day` : 'Value is measured after the first week'}</div>
        </Card>
      </div>
      <div>
        <h3 className="mb-2 font-display font-semibold">Recent activity</h3>
        <EventList agentId={agent.id} limit={4} />
      </div>
    </div>
  );
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function JdTab({ agent }: { agent: Agent }) {
  const updateAgent = useDb((s) => s.updateAgent);
  const [jd, setJd] = useState<JobDescription>(agent.jd);
  useEffect(() => setJd(agent.jd), [agent.jd]);
  const dirty = JSON.stringify(jd) !== JSON.stringify(agent.jd);
  const listField = (key: 'responsibilities' | 'outputs' | 'kpis' | 'escalation', label: string) => (
    <div>
      <label htmlFor={`jd-${key}`} className="mb-1.5 block text-sm font-medium">
        {label} <span className="font-normal text-fg-subtle">(one per line)</span>
      </label>
      <Textarea id={`jd-${key}`} value={jd[key].join('\n')} onChange={(e) => setJd({ ...jd, [key]: lines(e.target.value) })} className="min-h-24" />
    </div>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        updateAgent(agent.id, { jd, role: jd.title });
        toast.success('Job description updated');
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="jd-title" className="mb-1.5 block text-sm font-medium">
            Role title
          </label>
          <Input id="jd-title" value={jd.title} onChange={(e) => setJd({ ...jd, title: e.target.value })} />
        </div>
        <div>
          <label htmlFor="jd-schedule" className="mb-1.5 block text-sm font-medium">
            Schedule
          </label>
          <Input id="jd-schedule" value={jd.schedule} onChange={(e) => setJd({ ...jd, schedule: e.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor="jd-mission" className="mb-1.5 block text-sm font-medium">
          Mission
        </label>
        <Textarea id="jd-mission" value={jd.mission} onChange={(e) => setJd({ ...jd, mission: e.target.value })} className="min-h-20" />
      </div>
      {listField('responsibilities', 'Responsibilities')}
      <div className="grid gap-4 sm:grid-cols-2">
        {listField('outputs', 'Outputs')}
        {listField('kpis', 'Success KPIs')}
      </div>
      {listField('escalation', 'Escalation rules')}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={!dirty} onClick={() => setJd(agent.jd)}>
          Discard
        </Button>
        <Button type="submit" variant="primary" disabled={!dirty}>
          Save JD
        </Button>
      </div>
    </form>
  );
}

const ACTION_LIBRARY = [
  'Send daily briefing',
  'Raise alerts',
  'Change shelf price within ±5%',
  'Draft purchase orders',
  'Place purchase orders',
  'Reply to customers',
  'Refund up to £30',
  'Publish social posts',
  'Change staff rotas',
  'Start promotions',
];

export function PermissionsTab({ agent }: { agent: Agent }) {
  const updateAgent = useDb((s) => s.updateAgent);
  const [cap, setCap] = useState(agent.permissions.spendingCapPerDay);
  const [allowed, setAllowed] = useState<string[]>(agent.permissions.allowedActions);
  const [custom, setCustom] = useState('');
  const all = [...new Set([...agent.permissions.allowedActions, ...agent.permissions.blockedActions, ...ACTION_LIBRARY, ...allowed])];
  const dirty = cap !== agent.permissions.spendingCapPerDay || JSON.stringify([...allowed].sort()) !== JSON.stringify([...agent.permissions.allowedActions].sort());
  const save = () => {
    updateAgent(agent.id, {
      permissions: { spendingCapPerDay: cap, allowedActions: allowed, blockedActions: all.filter((a) => !allowed.includes(a)) },
      jd: { ...agent.jd, spendingCapPerDay: cap },
    });
    toast.success('Permissions updated');
  };
  return (
    <div className="space-y-6">
      <Slider label="Daily spending cap" min={0} max={500} step={10} value={cap} onChange={setCap} format={(v) => (v ? `${fmt.money(v)} / day` : 'Cannot spend')} leftLabel="£0" rightLabel="£500" />
      {agent.trust === 'shadow' && (
        <p className="rounded-md border border-line/10 bg-line/5 p-3 text-sm text-fg-muted">
          {agent.name} is in Shadow mode, so allowed actions are only recommended, never carried out, until you promote it on the trust ladder.
        </p>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Allowed actions</legend>
        <ul className="divide-y divide-line/5 rounded-md border border-line/10">
          {all.map((a) => (
            <li key={a} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-sm">{a}</span>
              <span className={cn('text-xs', allowed.includes(a) ? 'text-success' : 'text-fg-subtle')}>{allowed.includes(a) ? 'Allowed' : 'Needs approval'}</span>
              <Switch label={a} checked={allowed.includes(a)} onChange={(v) => setAllowed((s) => (v ? [...s, a] : s.filter((x) => x !== a)))} />
            </li>
          ))}
        </ul>
      </fieldset>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) setAllowed((s) => [...s, custom.trim()]);
          setCustom('');
        }}
      >
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add a custom allowed action" aria-label="Custom action" />
        <Button type="submit" variant="outline">
          <Plus /> Add
        </Button>
      </form>
      <div className="flex justify-end">
        <Button variant="primary" disabled={!dirty} onClick={save}>
          Save permissions
        </Button>
      </div>
    </div>
  );
}

export function DataTab({ agent }: { agent: Agent }) {
  const connectors = useDb((s) => s.connectors);
  const updateAgent = useDb((s) => s.updateAgent);
  return (
    <div>
      <p className="mb-4 text-sm text-fg-muted">Choose which sources {agent.name} may read. Access is read-only.</p>
      <ul className="divide-y divide-line/5 rounded-md border border-line/10">
        {connectors.map((c) => {
          const on = agent.connectorIds.includes(c.id);
          return (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1">
                <div className="text-sm">{c.name}</div>
                {on && c.status !== 'connected' && <div className="text-xs text-warning">Access granted, but this source is not connected yet.</div>}
              </div>
              <Badge tone={c.status === 'connected' ? 'success' : c.status === 'needs-attention' ? 'warning' : 'neutral'}>{c.status.replace('-', ' ')}</Badge>
              <Switch
                label={`Allow ${agent.name} to read ${c.name}`}
                checked={on}
                onChange={(v) => updateAgent(agent.id, { connectorIds: v ? [...agent.connectorIds, c.id] : agent.connectorIds.filter((x) => x !== c.id) })}
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm">
        <Link to="/connect" className="text-cyan hover:underline">
          Manage data sources
        </Link>
      </p>
    </div>
  );
}

export function ReviewTab({ agent }: { agent: Agent }) {
  const updateAgent = useDb((s) => s.updateAgent);
  const [applied, setApplied] = useState<string[]>([]);
  const list = allReviews.filter((r) => r.agentId === agent.id);
  if (!list.length) {
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    return (
      <EmptyState
        icon={Sparkles}
        title="No review yet"
        description={`${agent.name}'s first monthly review will be ready on ${next.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`}
      />
    );
  }
  return (
    <div className="space-y-4">
      {list.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <ProgressRing value={r.score} size={72} stroke={7} label="Review score">
              <span className="font-display text-lg font-semibold">{r.score}</span>
            </ProgressRing>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">
                {parseDay(`${r.month}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} review
              </h3>
              <Badge tone={r.recommendation === 'promote' ? 'success' : r.recommendation === 'retrain' ? 'warning' : r.recommendation === 'retire' ? 'danger' : 'cyan'} className="capitalize">
                Recommendation: {r.recommendation}
              </Badge>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium text-success">Strengths</h4>
              <ul className="space-y-1.5 text-sm">
                {r.strengths.map((s) => (
                  <li key={s} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-warning">Issues</h4>
              <ul className="space-y-1.5 text-sm">
                {r.issues.map((s) => (
                  <li key={s} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <h4 className="mb-2 mt-5 text-sm font-medium">Suggested JD changes</h4>
          <ul className="space-y-2">
            {r.suggestedJdChanges.map((c) => (
              <li key={c} className="flex items-center gap-3 rounded-md border border-violet/20 bg-violet/5 px-3 py-2 text-sm">
                <span className="flex-1">{c}</span>
                <Button
                  size="sm"
                  variant={applied.includes(c) ? 'success' : 'outline'}
                  disabled={applied.includes(c)}
                  onClick={() => {
                    updateAgent(agent.id, { jd: { ...agent.jd, responsibilities: [...agent.jd.responsibilities, c] } });
                    setApplied((a) => [...a, c]);
                    toast.success('Added to the job description');
                  }}
                >
                  {applied.includes(c) ? 'Applied' : 'Apply'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function SettingsTab({ agent }: { agent: Agent }) {
  const updateAgent = useDb((s) => s.updateAgent);
  const removeAgent = useDb((s) => s.removeAgent);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const paused = agent.status === 'paused';
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Mode</div>
          <div className="text-sm text-fg-muted">Company mode is guided. Builder mode exposes prompt, tools and model.</div>
        </div>
        <Segmented<AgentMode>
          label="Agent mode"
          value={agent.mode}
          onChange={(mode) => updateAgent(agent.id, { mode })}
          options={[
            { value: 'company', label: 'Company' },
            { value: 'builder', label: 'Builder' },
          ]}
        />
      </div>
      {agent.mode === 'builder' && (
        <Card className="space-y-5 p-4">
          <div>
            <label htmlFor="agent-model" className="mb-1.5 block text-sm font-medium">
              Model
            </label>
            <select id="agent-model" value={agent.model} onChange={(e) => updateAgent(agent.id, { model: e.target.value })} className="h-10 w-full rounded-md border border-line/10 bg-surface/60 px-3 text-sm text-fg">
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>
          </div>
          <Slider label="Temperature" min={0} max={1} step={0.05} value={agent.temperature} onChange={(v) => updateAgent(agent.id, { temperature: v })} format={(v) => v.toFixed(2)} />
          <div>
            <label htmlFor="agent-prompt" className="mb-1.5 block text-sm font-medium">
              System prompt
            </label>
            <Textarea
              id="agent-prompt"
              defaultValue={agent.systemPrompt ?? `You are ${agent.name}, the ${agent.role}. ${agent.jd.mission}`}
              onBlur={(e) => updateAgent(agent.id, { systemPrompt: e.target.value })}
              className="min-h-32 font-mono text-xs"
            />
          </div>
        </Card>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">{paused ? 'Paused' : 'Working'}</div>
          <div className="text-sm text-fg-muted">Pausing stops all work and holds pending approvals.</div>
        </div>
        <Button variant="outline" onClick={() => { updateAgent(agent.id, { status: paused ? 'working' : 'paused' }); toast(paused ? `${agent.name} resumed` : `${agent.name} paused`); }}>
          {paused ? <Play /> : <Pause />} {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Open in avatar studio</div>
          <div className="text-sm text-fg-muted">Change face, voice and personality.</div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/avatars?agent=${agent.id}`}>
            <Wrench /> Edit avatar
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-md border border-danger/25 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-danger">Let {agent.name} go</div>
          <div className="text-sm text-fg-muted">Removes the agent from your company. History is kept.</div>
        </div>
        <Button variant="danger" onClick={() => setConfirm(true)}>
          <Trash2 /> Let go
        </Button>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Let {agent.name} go?</DialogTitle>
            <DialogDescription>They will stop working immediately. You can hire the same role again from the marketplace.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeAgent(agent.id);
                toast(`${agent.name} has left the company`);
                navigate('/company');
              }}
            >
              Let go
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
